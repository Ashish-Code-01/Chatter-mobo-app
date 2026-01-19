import { useEffect, useState } from "react";
import { socket } from "../utils/socket.js";
import { QRCodeCanvas } from "qrcode.react";

function App() {
    const [socketId, setSocketId] = useState("");

    useEffect(() => {
        socket.connect();

        socket.on("connect", () => {
            setSocketId(socket.id);
            console.log("Connected:", socket.id);
        });


        socket.on("DeviceLinked", (token) => {
            console.log("Device Token:", token);
            localStorage.setItem("token", token);
        });

        socket.on("disconnect", () => {
            console.log("Disconnected");
        });

    }, []);


    return (
        <div>
            <h1>Socket.IO React Client</h1>
            <p>Socket ID: {socketId}</p>
            <QRCodeCanvas
                value={socketId}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"      // Error correction: L, M, Q, H
                includeMargin
            />
        </div>
    );
}

export default App;
