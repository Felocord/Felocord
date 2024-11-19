import patchErrorBoundary from "@core/debug/patches/patchErrorBoundary";
import initFixes from "@core/fixes";
import { initFetchI18nStrings } from "@core/i18n";
import initSettings from "@core/ui/settings";
import { initVendettaObject } from "@core/vendetta/api";
import { VdPluginManager } from "@core/vendetta/plugins";
import { updateFonts } from "@lib/addons/fonts";
import { initPlugins, updatePlugins } from "@lib/addons/plugins";
import { initThemes, patchChatBackground } from "@lib/addons/themes";
import { patchCommands } from "@lib/api/commands";
import { patchLogHook } from "@lib/api/debug";
import { injectFluxInterceptor } from "@lib/api/flux";
import { writeFile } from "@lib/api/native/fs";
import { isPyonLoader, isThemeSupported } from "@lib/api/native/loader";
import { patchJsx } from "@lib/api/react/jsx";
import { logger } from "@lib/utils/logger";
import { patchSettings } from "@ui/settings";

import * as lib from "./lib";

function maybeLoadThemes() {
    if (!isThemeSupported()) return;

    try {
        if (isPyonLoader()) {
            writeFile("../vendetta_theme.json", "null");
        }
        initThemes();
    } catch (e) {
        console.error("Failed to initialize themes", e);
    }
}

export default async () => {
    maybeLoadThemes();

    // Load everything in parallel
    await Promise.all([
        injectFluxInterceptor(),
        patchSettings(),
        patchLogHook(),
        patchCommands(),
        patchChatBackground(),
        patchJsx(),
        initVendettaObject(),
        initFetchI18nStrings(),
        initSettings(),
        initFixes(),
        patchErrorBoundary(),
        updatePlugins()
    ]).then(
        // Push them all to unloader
        u => u.forEach(f => f && lib.unload.push(f))
    );

    // Assign window object
    window.felocord = lib;

    // Once done, load Vendetta plugins
    VdPluginManager.initPlugins()
        .then(u => lib.unload.push(u))
        .catch(() => alert("Failed to initialize Vendetta plugins"));

    // And then, load Bunny plugins
    initPlugins();

    // Update the fonts
    updateFonts();

    // We good :)
    logger.log("Felocord is ready!");
};
