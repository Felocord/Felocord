import { Author } from "@lib/addons/types";
import { createStorage } from "@lib/api/storage";
import { Logger } from "@lib/utils/logger";

export interface PluginRepo {
    [id: string]: {
        version: string;

        // For plugin developing convenience, plugins with this on will always get fetched
        alwaysFetch?: boolean;
    };
}

export interface PluginRepoStorage {
    [repoUrl: string]: PluginRepo;
}

export interface PluginSettingsStorage {
    [pluginId: string]: {
        enabled: boolean;
    };
}

export interface FelocordPluginManifest {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly version: string;
    readonly authors: Author[];
}

export interface FelocordPluginManifestInternal extends FelocordPluginManifest {
    readonly parentRepository: string;
    readonly jsPath?: string;
}

export interface PluginInstance {
    start?(): void;
    stop?(): void;
    SettingsComponent?(): JSX.Element;
}

export interface PluginInstanceInternal extends PluginInstance {
    readonly manifest: FelocordPluginManifest;
}

export interface FelocordPluginProperty {
    readonly manifest: FelocordPluginManifestInternal;
    readonly logger: Logger;
    createStorage<T extends object>(): ReturnType<typeof createStorage<T>>;
}

export type FelocordPluginObject = typeof window.felocord & {
    plugin: FelocordPluginProperty;
};
