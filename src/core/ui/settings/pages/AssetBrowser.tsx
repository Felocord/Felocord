import AssetDisplay from "@core/ui/components/AssetDisplay";
import { all } from "@lib/api/assets";
import { ReactNative as RN } from "@metro/common";
import { ErrorBoundary, Forms, Search } from "@ui/components";

const { FormDivider } = Forms;

export default function AssetBrowser() {
    const [search, setSearch] = React.useState("");

    return (
        <ErrorBoundary>
            <RN.View style={{ flex: 1 }}>
                <Search
                    style={{ margin: 10 }}
                    onChangeText={(v: string) => setSearch(v)}
                    placeholder="Search"
                />
                <RN.FlatList
                    data={Object.values(all).filter(a => a.name.includes(search) || a.id.toString() === search)}
                    renderItem={({ item }) => <AssetDisplay asset={item} />}
                    ItemSeparatorComponent={FormDivider}
                    keyExtractor={item => item.name}
                />
            </RN.View>
        </ErrorBoundary>
    );
}
