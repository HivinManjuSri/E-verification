import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

// Initialize NFC Manager once
let NfcManager = null;
let isInitializing = false;
let initPromise = null;

// Check if running in Expo Go
const isExpoGo = __DEV__ && global.expo?.modules?.constants?.executionEnvironment === 'storeClient';

async function initializeNfcManager() {
    if (isExpoGo) {
        throw new Error("NFC is not supported in Expo Go. Please use a development build.");
    }

    if (NfcManager) return NfcManager;
    if (isInitializing) return initPromise;
    
    isInitializing = true;
    initPromise = new Promise((resolve, reject) => {
        try {
            const manager = require("react-native-nfc-manager").default;
            console.log("NFC Manager imported successfully");
            NfcManager = manager;
            resolve(manager);
        } catch (error) {
            console.log("NFC Manager import failed:", error.message);
            reject(error);
        } finally {
            isInitializing = false;
        }
    });
    
    return initPromise;
}

function App() {
    const [nfcState, setNfcState] = useState({
        isSupported: false,
        isEnabled: false,
        error: null,
        loading: true,
        platform: Platform.OS,
        isExpoGo: isExpoGo
    });

    const retryCount = useRef(0);
    const maxRetries = 3;

    useEffect(() => {
        let isMounted = true;
        let retryTimeout = null;

        async function checkNfc() {
            console.log("Starting NFC check...");
            console.log("Platform:", Platform.OS);
            console.log("Is Expo Go:", isExpoGo);

            if (isExpoGo) {
                if (isMounted) {
                    setNfcState(prev => ({
                        ...prev,
                        isSupported: false,
                        isEnabled: false,
                        error: "NFC is not supported in Expo Go. Please use a development build.",
                        loading: false
                    }));
                }
                return;
            }

            try {
                // Initialize NFC Manager
                const manager = await initializeNfcManager();
                if (!manager) {
                    throw new Error("Failed to initialize NFC Manager");
                }

                // First check if the device has NFC hardware
                const hasNfc = await manager.isSupported();
                console.log("Device has NFC hardware:", hasNfc);

                if (!hasNfc) {
                    if (isMounted) {
                        setNfcState(prev => ({
                            ...prev,
                            isSupported: false,
                            isEnabled: false,
                            error: "This device does not have NFC hardware",
                            loading: false
                        }));
                    }
                    return;
                }

                // Then check if NFC is enabled
                try {
                    const isEnabled = await manager.isEnabled();
                    console.log("NFC is enabled:", isEnabled);

                    if (!isEnabled) {
                        if (isMounted) {
                            setNfcState(prev => ({
                                ...prev,
                                isSupported: true,
                                isEnabled: false,
                                error: "NFC is not enabled. Please enable NFC in your device settings.",
                                loading: false
                            }));
                        }
                        return;
                    }

                    // Try to start NFC
                    try {
                        await manager.start();
                        console.log("NFC started successfully");
                        
                        if (isMounted) {
                            setNfcState(prev => ({
                                ...prev,
                                isSupported: true,
                                isEnabled: true,
                                error: null,
                                loading: false
                            }));
                        }
                        // Reset retry count on success
                        retryCount.current = 0;
                    } catch (startError) {
                        console.log("Error starting NFC:", startError);
                        if (isMounted) {
                            setNfcState(prev => ({
                                ...prev,
                                isSupported: true,
                                isEnabled: true,
                                error: "Failed to start NFC: " + startError.message,
                                loading: false
                            }));
                        }
                    }
                } catch (enableError) {
                    console.log("Error checking NFC enabled:", enableError);
                    if (isMounted) {
                        setNfcState(prev => ({
                            ...prev,
                            isSupported: true,
                            isEnabled: false,
                            error: "Failed to check NFC status: " + enableError.message,
                            loading: false
                        }));
                    }
                }
            } catch (error) {
                console.log("Error in NFC check:", error);
                if (isMounted) {
                    setNfcState(prev => ({
                        ...prev,
                        isSupported: false,
                        isEnabled: false,
                        error: error.message || "Failed to check NFC support",
                        loading: false
                    }));

                    // Only retry if not in Expo Go
                    if (!isExpoGo && retryCount.current < maxRetries) {
                        retryCount.current += 1;
                        console.log(`Retrying NFC check (${retryCount.current}/${maxRetries})...`);
                        retryTimeout = setTimeout(checkNfc, 2000); // Retry after 2 seconds
                    }
                }
            }
        }

        checkNfc();

        return () => {
            isMounted = false;
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
            if (NfcManager) {
                try {
                    NfcManager.cancelTechnologyRequest().catch(() => {});
                } catch (e) {
                    console.log("Cleanup error:", e);
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
                    <Text style={styles.text}>Platform: {nfcState.platform}</Text>
                    <Text style={styles.text}>Running in Expo Go: {nfcState.isExpoGo ? "Yes" : "No"}</Text>

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
                            {nfcState.isExpoGo 
                                ? "Please use a development build to enable NFC"
                                : "NFC is not available or not enabled"}
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