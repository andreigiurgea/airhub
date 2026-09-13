import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/Use_AI_Image_May_16,_2026,_21_11_51.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.description}>
          Your all-in-one tool for seamless skydiving.{'\n'}
          Check in at dropzones, book coaching, join loads,{'\n'}
          track your jumps, and more. Whether you're{'\n'}
          mastering the skies or just starting out, Log•X{'\n'}
          is here to support your journey.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.buttonText}>Get started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D6E4EE',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 280,
    height: 180,
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 64,
    borderRadius: 28,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
