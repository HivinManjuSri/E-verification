import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

let NfcManager = null;
try {
    NfcManager = require("react-native-nfc-manager").default;
} catch (error) {
    console.log("NFC Manager not available:", error.message);
}

function App() {
    const [nfcState, setNfcState] = useState({
        isSupported: false,
        isEnabled: false,
        error: null,
        loading: true,
    });
      
    useEffect(() => {
        async function checkNfc() {
            if (!NfcManager) {
                setNfcState({
                    isSupported: false,
                    isEnabled: false,
                    error: "NFC module not available. Please use a development build.",
                    loading: false,
                });
                return;
            }

            try {
                const isSupported = await NfcManager.isSupported();
                console.log("NFC is supported:", isSupported);

                let isEnabled = false;
                if (isSupported) {
                    try {
                        isEnabled = await NfcManager.isEnabled();
                        console.log("NFC is enabled:", isEnabled);

                        if (isEnabled) {
                            try {
                                await NfcManager.start();
                                console.log("NFC started successfully");
                            } catch (startError) {
                                console.log("Error starting NFC:", startError);
                                setNfcState({
                                    isSupported,
                                    isEnabled,
                                    error: "Failed to start NFC: " + startError.message,
                                    loading: false,
                                });
                                return;
                            }
                        }
                    } catch (enableError) {
                        console.log("Error checking NFC enabled:", enableError);
                        setNfcState({
                            isSupported,
                            isEnabled: false,
                            error: "Failed to check NFC status: " + enableError.message,
                            loading: false,
                        });
                        return;
                    }
                }

                setNfcState({
                    isSupported,
                    isEnabled,
                    error: null,
                    loading: false,
                });
            } catch (error) {
                console.log("Error checking NFC:", error);
                setNfcState({
                    isSupported: false,
                    isEnabled: false,
                    error: error.message || "Unknown NFC error",
                    loading: false,
                });
            }
        }

        checkNfc();

        return () => {
            if (NfcManager) {
                try {
                    NfcManager.cancelTechnologyRequest().catch(() => {});
                } catch (e) {
                    //ignore any cleanup errors
                }
            }
        };
    }, []);

    return (
        <View style={styles.wrapper}>
            <Text style={styles.title}>NFC Tag Counter</Text>

            {nfcState.loading ? (
                <Text style={styles.loading}>Checking capabilities...</Text>
            ) : (
                <>
                    <Text style={styles.text}>Platform: {Platform.OS}</Text>

                    {nfcState.error ? (
                        <Text style={styles.errorText}>Error: {nfcState.error}</Text>
                    ) : (
                        <>
                            <Text style={styles.text}>
                                NFC supported: {nfcState.isSupported ? "Yes" : "No"}
                            </Text>
                            {nfcState.isSupported && (
                                <Text style={styles.text}>
                                    NFC Enabled: {nfcState.isEnabled ? "Yes" : "No"}
                                </Text>
                            )}
                        </>
                    )}

                    {nfcState.isSupported && nfcState.isEnabled ? (
                        <Text style={styles.readyText}>Ready to scan NFC tags</Text>
                    ) : (
                        <Text style={styles.noReadyText}>
                            NFC is not available or not enabled
                        </Text>
                    )}

                    <Text style={styles.welcomeText}>HELLO WORLD</Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5fcff",
        padding: 20,
    },
    title: {
        fontSize: 20,
        textAlign: "center",
        marginBottom: 20,
        color: "#333",
    },
    text: {
        fontSize: 16,
        color: "#333",
        marginBottom: 10,
    },
    errorText: {
        fontSize: 16,
        color: "red",
        marginBottom: 10,
    },
    readyText: {
        fontSize: 16,
        color: "green",
        marginTop: 20,
        marginBottom: 20,
    },
    noReadyText: {
        fontSize: 16,
        color: "red",
        marginTop: 20,
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "blue",
        marginTop: 30,
        marginBottom: 30,
    },
});

export default App;