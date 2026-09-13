import { View, Text, StyleSheet } from 'react-native';
import Header from '@/components/Header';

export default function DropzonesScreen() {
  return (
    <View style={styles.container}>
      <Header title="Dropzones" showBack={false} showNotifications={true} />
      <View style={styles.content}>
        <Text style={styles.text}>Dropzones Screen</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8F0',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    color: '#1A1A1A',
  },
});
