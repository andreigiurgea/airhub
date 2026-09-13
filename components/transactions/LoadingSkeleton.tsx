import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor: '#D4E8F0', borderRadius: 6, opacity },
        style,
      ]}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.refRow}>
            <SkeletonBlock width={130} height={13} />
            <SkeletonBlock width={70} height={20} style={{ borderRadius: 20 }} />
          </View>
          <SkeletonBlock width={90} height={10} style={{ marginTop: 6 }} />
        </View>
        <SkeletonBlock width={80} height={18} style={{ borderRadius: 6 }} />
      </View>
      <View style={styles.cardMeta}>
        <SkeletonBlock width={55} height={20} style={{ borderRadius: 8 }} />
        <SkeletonBlock width={45} height={20} style={{ borderRadius: 8 }} />
        <SkeletonBlock width={100} height={20} style={{ borderRadius: 8 }} />
      </View>
    </View>
  );
}

export default function LoadingSkeleton() {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#1A2B3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 6,
  },
});
