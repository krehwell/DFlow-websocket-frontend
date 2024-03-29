import { useRef, useState } from "react";
import Head from "next/head";
import { Flex, FlexColumn, FlexRowAlignCenter } from "@/components/Flex";
import io from "socket.io-client";
import { IUser, IUserWithMessage } from "@/types/common";
import InputWithJoinButtonHandler from "./InputWithJoinButtonHandler";
import { useSocketListenerHandler } from "./useSocketListenerHandler";

const socket = io("http://localhost:5000");

const getUserFromSessionStorage = (): IUser | null => {
    // get user using try and catch instead
    const user = sessionStorage.getItem("user");
    if (!user) return null;
    return JSON.parse(user);
};

export default function Home() {
    const [isJoined, setIsJoined] = useState(false);
    const [usersOnline, setUsersOnline] = useState<IUser[]>([]);
    const currentUser = usersOnline.find(user => user.id === getUserFromSessionStorage()?.id);

    // message related states
    const [value, setValue] = useState("");
    const [messages, setMessages] = useState<IUserWithMessage[]>([]);

    // socket listeners
    useSocketListenerHandler(socket, {
        disabled: !isJoined,
        onNewMessage: data => setMessages(prev => [...prev, data]),
        onLeft: data => setMessages(prev => [...prev, { user: data, message: <i>left</i> }]),
        onJoin: data => setMessages(prev => [...prev, { user: data, message: <i>joined</i> }]),
        onWhoIsOnline: data => setUsersOnline(data),
    });

    // socket emmiters
    const sendMessage = () => {
        socket.emit("send-message", { message: value });
        emitTypingOrStopTypingHandler({ delay: 0 });
        setValue("");
    };

    const emitTyping = () => {
        socket.emit("typing");
    };

    const emitStopTyping = () => {
        socket.emit("stop-typing");
    };

    const typingTimeout = useRef<any>();
    const emitTypingOrStopTypingHandler = ({ delay }: { delay: number }) => {
        clearTimeout(typingTimeout.current);
        if (!currentUser?.isTyping) {
            emitTyping();
        }
        typingTimeout.current = setTimeout(() => emitStopTyping(), delay);
    };

    // UI related functions
    const renderInput = () => {
        if (!isJoined) {
            return (
                <InputWithJoinButtonHandler
                    onJoin={username => {
                        socket.emit("join", { username });
                        setIsJoined(true);
                    }}
                />
            );
        }

        return (
            <FlexRowAlignCenter style={{ marginTop: "auto", gap: "1rem" }}>
                <input
                    style={{ width: "100%", height: "3rem", fontSize: "1.2rem" }}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            sendMessage();
                            return;
                        }
                        emitTypingOrStopTypingHandler({ delay: 1000 });
                    }}
                />
                <button style={{ height: "3rem", fontSize: "1.2rem", width: "5rem" }} onClick={sendMessage}>
                    Send
                </button>
            </FlexRowAlignCenter>
        );
    };

    const renderMessages = () => {
        if (!isJoined || !messages.length) return null;

        return messages.map(({ user, message }, i) => {
            const ownProfile = getUserFromSessionStorage();
            const isMine = ownProfile?.id === user.id;
            return (
                <FlexColumn
                    key={user.id + message + i}
                    style={{
                        padding: "0.6rem 1rem",
                        backgroundColor: i % 2 === 1 ? "#fff" : "#eee",
                        textAlign: isMine ? "left" : "right",
                    }}>
                    <span>{message}</span>
                    <span style={{ fontWeight: "bold", fontSize: "small" }}>{user.username}</span>
                </FlexColumn>
            );
        });
    };

    const renderWhoIsOnline = () => {
        if (!isJoined) return null;

        return (
            <FlexColumn style={{ padding: "2rem", backgroundColor: "beige", width: "25%" }}>
                <h3 style={{ marginBottom: "1rem" }}>Online Users</h3>
                <FlexColumn as="ul" style={{ gap: "0.3rem" }}>
                    {usersOnline.map(user => {
                        const isMine = getUserFromSessionStorage()?.id === user.id;
                        const isTyping = !isMine && user.isTyping;
                        return (
                            <li key={user.id}>
                                {user.username} {isMine && <i>(me)</i>} {isTyping && <i>(typing...)</i>}
                            </li>
                        );
                    })}
                </FlexColumn>
            </FlexColumn>
        );
    };

    return (
        <>
            <Head>
                <title>DFlow Socket App</title>
                <meta name="description" content="Generated by create next app" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Flex style={{ height: "100vh" }}>
                {renderWhoIsOnline()}
                <FlexColumn as="main" style={{ justifyContent: "flex-end", width: "100%" }}>
                    {renderMessages()}
                    {renderInput()}
                </FlexColumn>
            </Flex>
        </>
    );
}
