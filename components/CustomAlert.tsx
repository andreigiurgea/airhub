import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  onDismiss?: () => void;
}

export default function CustomAlert({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', onPress: () => {}, style: 'default' }],
  onDismiss,
}: CustomAlertProps) {
  const handleButtonPress = (onPress: () => void) => {
    onPress();
    if (onDismiss) {
      onDismiss();
    }
  };

  const getButtonStyle = (style?: 'default' | 'cancel' | 'destructive') => {
    if (style === 'destructive') {
      return styles.buttonDestructive;
    }
    if (style === 'cancel') {
      return styles.buttonCancel;
    }
    return styles.buttonDefault;
  };

  const getButtonTextStyle = (style?: 'default' | 'cancel' | 'destructive') => {
    if (style === 'destructive') {
      return styles.buttonTextDestructive;
    }
    if (style === 'cancel') {
      return styles.buttonTextCancel;
    }
    return styles.buttonTextDefault;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <View style={styles.alertContent}>
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
          </View>

          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  getButtonStyle(button.style),
                  buttons.length === 1 && styles.buttonSingle,
                ]}
                onPress={() => handleButtonPress(button.onPress)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.buttonText, getButtonTextStyle(button.style)]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  alertContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSingle: {
    marginHorizontal: 8,
  },
  buttonDefault: {
    backgroundColor: '#9B7EDE',
  },
  buttonCancel: {
    backgroundColor: '#F0F0F0',
  },
  buttonDestructive: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDefault: {
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    color: '#1A1A1A',
  },
  buttonTextDestructive: {
    color: '#FFFFFF',
  },
});
