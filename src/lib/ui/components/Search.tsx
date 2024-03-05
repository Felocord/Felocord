import { Strings } from "@core/i18n";
import { getAssetIDByName } from "@lib/api/assets";
import { ReactNative as RN } from "@metro/common";
import { findByProps } from "@metro/filters";
import ErrorBoundary from "@ui/components/ErrorBoundary";

const { TextInput } = findByProps("TableRow");

export interface SearchProps {
    onChangeText?: (v: string) => void;
    placeholder?: string;
    style?: import("react-native").TextStyle;
}


function SearchIcon() {
    return <RN.Image style={{ transform: [{ scale: 0.8 }] }} source={getAssetIDByName("search")} />;
}

export default ({ onChangeText, placeholder, style }: SearchProps) => {
    const [query, setQuery] = React.useState("");

    const onChange = (value: string) => {
        setQuery(value);
        onChangeText?.(value);
    };

    return <ErrorBoundary>
        <RN.View style={style}>
            <TextInput isClearable grow
                leadingIcon={SearchIcon}
                placeholder={placeholder ?? Strings.SEARCH}
                onChange={onChange}
                returnKeyType={"search"}
                size="md"
                autoCapitalize="none"
                autoCorrect={false}
                value={query}
            />
        </RN.View>
    </ErrorBoundary>;
};
