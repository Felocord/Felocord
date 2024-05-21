import { ExportsFlags, getMetroCache, indexBlacklistFlag, indexExportsFlags } from "@metro/caches";
import { Metro } from "@metro/types";
import { before, instead } from "spitroast";

export const metroModules: Metro.ModuleList = window.modules;
const metroRequire: Metro.Require = window.__r;

// eslint-disable-next-line func-call-spacing
const moduleSubscriptions = new Map<number, Set<() => void>>();
const blacklistedIds = new Set<String>();
const noopHandler = () => undefined;
const functionToString = Function.prototype.toString;

let patchedInspectSource = false;
let patchedImportTracker = false;
let _importingModuleId: string | null = null;

for (const id in metroModules) {
    const metroModule = metroModules[id];

    const cache = getMetroCache().exportsIndex[id];
    if (cache?.[0] & ExportsFlags.BLACKLISTED) {
        blacklistModule(id);
        continue;
    }

    if (metroModule!.factory) {
        instead("factory", metroModule, ((args: Parameters<Metro.FactoryFn>, origFunc: Metro.FactoryFn) => {
            _importingModuleId = id;
            const { 1: metroRequire, 4: moduleObject } = args;

            args[2 /* metroImportDefault */] = id => {
                const exps = metroRequire(id);
                return exps && exps.__esModule ? exps.default : exps;
            };

            args[3 /* metroImportAll */] = id => {
                const exps = metroRequire(id);
                if (exps && exps.__esModule) return exps;

                const importAll: Record<string, any> = {};
                if (exps) Object.assign(importAll, exps);
                importAll.default = exps;
                return importAll;
            };

            origFunc(...args);
            if (!isBadExports(moduleObject.exports)) {
                onModuleRequire(moduleObject.exports, id);
            } else {
                blacklistModule(id);
            }
            _importingModuleId = null;
        }) as any); // If only spitroast had better types
    }
}

/** Makes the module associated with the specified ID non-enumberable. */
function blacklistModule(id: string) {
    Object.defineProperty(metroModules, id, { enumerable: false });
    blacklistedIds.add(id);
    indexBlacklistFlag(Number(id));
}

function isBadExports(exports: any) {
    return !exports
        || exports === window
        || exports["<!@ pylix was here :fuyusquish: !@>"] === null
        || (exports.__proto__ === Object.prototype && Reflect.ownKeys(exports).length === 0);
}

function onModuleRequire(moduleExports: any, id: Metro.ModuleID) {
    indexExportsFlags(Number(id), moduleExports);

    // Temporary
    moduleExports.initSentry &&= () => undefined;
    if (moduleExports.default?.track && moduleExports.default.trackMaker)
        moduleExports.default.track = () => Promise.resolve();

    if (moduleExports.registerAsset) {
        require("@lib/api/assets").patchAssets(moduleExports);
    }

    // There are modules registering the same native component
    if (moduleExports?.default?.name === "requireNativeComponent") {
        instead("default", moduleExports, (args, origFunc) => {
            try {
                return origFunc(...args);
            } catch {
                return args[0];
            }
        });
    }

    // Hook DeveloperExperimentStore
    if (moduleExports?.default?.constructor?.displayName === "DeveloperExperimentStore") {
        moduleExports.default = new Proxy(moduleExports.default, {
            get(target, property, receiver) {
                if (property === "isDeveloper") {
                    // Hopefully won't explode accessing it here :3
                    const { settings } = require("@lib/settings");
                    return settings.enableDiscordDeveloperSettings ?? false;
                }

                return Reflect.get(target, property, receiver);
            }
        });
    }

    if (!patchedImportTracker && moduleExports.fileFinishedImporting) {
        before("fileFinishedImporting", moduleExports, ([filePath]) => {
            if (_importingModuleId == null || !filePath) return;
            metroModules[_importingModuleId]!.__filePath = filePath;
        });
        patchedImportTracker = true;
    }

    // Funny infinity recursion caused by a race condition
    if (!patchedInspectSource && window["__core-js_shared__"]) {
        const inspect = (f: unknown) => typeof f === "function" && functionToString.apply(f, []);
        window["__core-js_shared__"].inspectSource = inspect;
        patchedInspectSource = true;
    }

    // Explosion (no, I can't explain this, don't ask) ((hi rosie))
    if (moduleExports.findHostInstance_DEPRECATED) {
        const numberedId = Number(id);
        const prevExports = metroModules[numberedId - 1]?.publicModule.exports;
        const inc = prevExports.default?.reactProfilingEnabled ? 1 : -1;
        if (!metroModules[numberedId + inc]?.isInitialized) {
            blacklistModule(String(numberedId + inc));
        }
    }

    // Hindi timestamps moment
    if (moduleExports.isMoment) {
        instead("defineLocale", moduleExports, (args, orig) => {
            const origLocale = moduleExports.locale();
            orig(...args);
            moduleExports.locale(origLocale);
        });
    }

    moduleSubscriptions.get(Number(id))?.forEach(s => s());
}

export function getImportingModuleId() {
    return _importingModuleId;
}

export function subscribeModule(id: number, cb: () => void): () => void {
    const subs = moduleSubscriptions.get(id) ?? new Set();

    const deleteIfEmpty = () => {
        subs.delete(cb);
        if (moduleSubscriptions.get(id)?.size === 0) {
            moduleSubscriptions.delete(id);
        }
    };
    const wrappedCb = () => {
        cb();
        deleteIfEmpty();
    };

    subs.add(wrappedCb);
    moduleSubscriptions.set(id, subs);

    return () => {
        subs.delete(wrappedCb);
        deleteIfEmpty();
    };
}

export function requireModule(id: Metro.ModuleID) {
    if (!metroModules[0]?.isInitialized) metroRequire(0);
    if (blacklistedIds.has(String(id))) return undefined;

    if (Number(id) === -1) return require("@metro/polyfills/redesign");

    if (metroModules[id]?.isInitialized && !metroModules[id]?.hasError) {
        return metroRequire(id);
    }

    // Disable Internal Metro error reporting logic
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler(noopHandler);

    let moduleExports;
    try {
        moduleExports = metroRequire(id);
    } catch {
        blacklistModule(String(id));
        moduleExports = undefined;
    }

    // Done initializing! Now, revert our hacks
    ErrorUtils.setGlobalHandler(originalHandler);

    return moduleExports;
}

export function* getModules(uniq: string, all = false) {
    yield [-1, require("@metro/polyfills/redesign")];

    let cache = getMetroCache().findIndex[uniq];
    if (all && !cache?._) cache = undefined;

    for (const id in cache ?? metroModules) {
        const exports = requireModule(id);
        if (isBadExports(exports)) continue;
        yield [id, exports];
    }
}

export function* getCachedPolyfillModules(name: string) {
    const cache = getMetroCache().polyfillIndex[name];
    for (const id in cache ?? metroModules) {
        const exports = requireModule(id);
        if (isBadExports(exports)) continue;
        yield [id, exports];
    }
}