import React from 'react';
import { View, StyleSheet } from 'react-native';

interface MessageTicksProps {
    status: 'sent' | 'delivered' | 'seen';
}

const MessageTicks: React.FC<MessageTicksProps> = ({ status }) => {
    const tickColor =
        status === 'seen'
            ? '#0099FF'
            : status === 'delivered'
            ? 'rgba(255, 255, 255, 0.7)'
            : 'rgba(255, 255, 255, 0.5)';

    const Tick = ({ color }: { color: string }) => (
        <View style={styles.tickWrapper}>
            <View
                style={[
                    styles.tick,
                    { borderBottomColor: color, borderRightColor: color },
                ]}
            />
        </View>
    );

    return (
        <View style={styles.tickContainer}>
            <Tick color={tickColor} />
            {status !== 'sent' && (
                <View style={styles.secondTick}>
                    <Tick color={tickColor} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    tickContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    tickWrapper: {
        width: 10,
        height: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tick: {
        width: 5,
        height: 9,
        borderBottomWidth: 1.5,
        borderRightWidth: 1.5,
        borderBottomColor: 'rgba(255, 255, 255, 0.5)',
        borderRightColor: 'rgba(255, 255, 255, 0.5)',
        transform: [{ rotate: '45deg' }],
    },
    secondTick: {
        marginLeft: -4,
    },
});

export default MessageTicks;