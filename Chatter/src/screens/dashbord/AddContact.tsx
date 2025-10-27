import {
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { useState } from 'react';




const Home = () => {
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('');


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>
                    Add Contact to Chatter
                </Text>
                {(loading) && (
                    <ActivityIndicator color="#007AFF" />
                )}
            </View>
            <View style={styles.searchContainer}>
                <TextInput
                    keyboardType="numeric"
                    style={styles.searchInput}
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing"
                />
            </View>
        </View>
    );
};

export default Home;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchInput: {
        height: 40,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
    },
});