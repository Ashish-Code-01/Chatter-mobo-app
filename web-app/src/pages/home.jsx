import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Smartphone, Monitor } from "lucide-react";
import { socket } from "../utils/socket.js";

function App() {
    const [socketId, setSocketId] = useState("");
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        socket.connect();

        socket.on("connect", () => {
            setSocketId(socket.id);
            setIsConnected(true);
            console.log("Connected:", socket.id);
        });

        socket.on("DeviceLinked", (token) => {
            console.log("Device Token:", token);
            // Store in state instead of localStorage
            console.log("Token would be stored:", token);
        });

        socket.on("disconnect", () => {
            console.log("Disconnected");
            setIsConnected(false);
        });
    }, []);

    return (
        <div className="min-h-screen bg-[#0F1419] flex items-center justify-center p-4">
            <div className="bg-white/[0.04] backdrop-blur-sm rounded-[28px] border border-[#00D4C2]/15 shadow-[0_10px_40px_rgba(0,212,194,0.15)] max-w-5xl w-full overflow-hidden">
                <div className="flex flex-col md:flex-row">
                    {/* Left Panel */}
                    <div className="p-8 md:p-12 md:w-1/2 border-r border-white/10">
                        <div className="max-w-md">
                            <h1 className="text-3xl font-extrabold text-white mb-8 tracking-wide">
                                Link Your Device
                            </h1>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                                        <div className="w-7 h-7 rounded-full border-2 border-[#00D4C2]/60 bg-[#00D4C2]/10 flex items-center justify-center text-sm text-[#00D4C2] font-bold">
                                            1
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[rgba(200,210,234,0.8)] text-sm leading-relaxed font-medium">
                                            Open the Chatter app on your phone
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                                        <div className="w-7 h-7 rounded-full border-2 border-[#00D4C2]/60 bg-[#00D4C2]/10 flex items-center justify-center text-sm text-[#00D4C2] font-bold">
                                            2
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[rgba(200,210,234,0.8)] text-sm leading-relaxed font-medium">
                                            Tap <span className="font-bold text-white">Menu</span> or{" "}
                                            <span className="font-bold text-white">Settings</span> and select{" "}
                                            <span className="font-bold text-white">Linked Devices</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                                        <div className="w-7 h-7 rounded-full border-2 border-[#00D4C2]/60 bg-[#00D4C2]/10 flex items-center justify-center text-sm text-[#00D4C2] font-bold">
                                            3
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[rgba(200,210,234,0.8)] text-sm leading-relaxed font-medium">
                                            Tap on <span className="font-bold text-white">Link a Device</span> or{" "}
                                            <span className="font-bold text-white">Link Device</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                                        <div className="w-7 h-7 rounded-full border-2 border-[#00D4C2]/60 bg-[#00D4C2]/10 flex items-center justify-center text-sm text-[#00D4C2] font-bold">
                                            4
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[rgba(200,210,234,0.8)] text-sm leading-relaxed font-medium">
                                            Point your phone at this screen to scan the QR code
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-white/10">
                                <a
                                    href="#"
                                    className="text-[#00D4C2] text-sm font-semibold hover:text-[#00D4C2]/80 transition-colors inline-flex items-center gap-2"
                                >
                                    <Smartphone className="w-4 h-4" />
                                    Link with phone number
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - QR Code */}
                    <div className="p-8 md:p-12 md:w-1/2 flex flex-col items-center justify-center bg-white/[0.02]">
                        <div className="text-center">
                            {isConnected && socketId ? (
                                <div className="relative">
                                    <div className="bg-white/[0.06] backdrop-blur-sm p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,212,194,0.2)] border border-[#00D4C2]/20 inline-block">
                                        <QRCodeCanvas
                                            value={socketId}
                                            size={264}
                                            bgColor="bg-white/[0.06]"
                                            fgColor="#00D4C2"
                                            level="M"
                                            includeMargin={false}
                                        />
                                    </div>

                                    {/* Logo overlay */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-2 shadow-lg">
                                        <div className="w-12 h-12 bg-gradient-to-br from-[#00D4C2] to-[#00A896] rounded-lg flex items-center justify-center shadow-[0_8px_16px_rgba(0,212,194,0.5)]">
                                            <Monitor className="w-7 h-7 text-[#0F1419]" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-[312px] h-[312px] bg-white/[0.04] border border-[#00D4C2]/20 rounded-2xl flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-12 h-12 border-4 border-[#00D4C2]/30 border-t-[#00D4C2] rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-[rgba(200,210,234,0.6)] text-sm font-medium">Connecting...</p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6">
                                <p className="text-xs text-[rgba(200,210,234,0.6)] max-w-xs mx-auto leading-relaxed font-medium">
                                    {isConnected ? (
                                        <>Connected. Scan the QR code to link your device.</>
                                    ) : (
                                        <>Establishing secure connection...</>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="mt-12 flex items-center gap-2 text-xs text-[#00D4C2]/70 font-semibold">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>End-to-end encrypted</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;