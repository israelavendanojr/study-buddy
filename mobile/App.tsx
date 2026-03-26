import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

// When running on a physical device via Expo Go, replace "localhost"
// with your machine's local IP address (e.g. 192.168.1.42).
const API_URL = "http://localhost:8000";

export default function App() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setMessage(data.message))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>StudBud</Text>

      {loading && <ActivityIndicator size="large" color="#4f46e5" />}
      {error && <Text style={styles.error}>Error: {error}</Text>}
      {message && <Text style={styles.message}>{message}</Text>}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  heading: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
  },
  message: {
    fontSize: 18,
    color: "#4f46e5",
    marginTop: 12,
  },
  error: {
    fontSize: 16,
    color: "#dc2626",
    marginTop: 12,
  },
});
