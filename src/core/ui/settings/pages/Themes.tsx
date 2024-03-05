import { Strings } from "@core/i18n";
import AddonPage from "@core/ui/components/AddonPage";
import ThemeCard from "@core/ui/components/ThemeCard";
import { useProxy } from "@lib/api/storage";
import { installTheme, Theme, themes } from "@lib/managers/themes";
import { settings } from "@lib/settings";
import { ButtonColors } from "@lib/utils/types";
import { Button } from "@ui/components";

export default function Themes() {
    useProxy(settings);

    return (
        <AddonPage<Theme>
            title={Strings.THEMES}
            fetchFunction={installTheme}
            items={themes}
            safeModeMessage={`${Strings.SAFE_MODE_NOTICE_THEMES}${settings.safeMode?.currentThemeId ? ` ${Strings.SAFE_MODE_NOTICE_THEMES_EXTEND}` : ""}`}
            safeModeExtras={settings.safeMode?.currentThemeId ? <Button
                text={Strings.DISABLE_THEME}
                color={ButtonColors.BRAND}
                size="small"
                onPress={() => {
                    delete settings.safeMode?.currentThemeId;
                }}
                style={{ marginTop: 8 }}
            /> : undefined}
            card={ThemeCard}
        />
    );
}
