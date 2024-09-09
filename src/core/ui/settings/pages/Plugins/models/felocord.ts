import { useProxy } from "@lib/api/storage/new";
import { disablePlugin, enablePlugin, getId, getPluginSettingsComponent,isPluginEnabled, pluginSettings } from "@lib/plugins";
import { FelocordPluginManifest } from "@lib/plugins/types";

import { UnifiedPluginModel } from "..";

export default function unifyFelocordPlugin(manifest: FelocordPluginManifest): UnifiedPluginModel {
    return {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        authors: manifest.authors,
        isEnabled: () => isPluginEnabled(getId(manifest)),
        isInstalled: () => manifest.id in pluginSettings,
        usePluginState() {
            useProxy(pluginSettings);
        },
        toggle(start: boolean) {
            start
                ? enablePlugin(getId(manifest), true)
                : disablePlugin(getId(manifest));
        },
        resolveSheetComponent() {
            return import("../sheets/PluginInfoActionSheet");
        },
        getPluginSettingsComponent() {
            return getPluginSettingsComponent(getId(manifest));
        },
    };
}
