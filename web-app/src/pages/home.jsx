import { useEffect, useState } from "react";
import { socket } from "../utils/socket.js";
import { QRCodeCanvas } from "qrcode.react";

function App() {
    const [socketId, setSocketId] = useState("");
    const [url, setURL] = useState("");


    const generateUrl = () => {
        let uri = ""
        uri = `http://10.115.97.98:8000?socketId=${socket.id}`;
        setURL(uri);
        console.log("Generated URL:", uri);
    }

    useEffect(() => {
        socket.connect();

        socket.on("connect", () => {
            setSocketId(socket.id);
            console.log("Connected:", socket.id);
            generateUrl();
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
                value={"this is the test qr-code "}
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
