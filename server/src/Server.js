"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
///<reference path="node_modules/@types/node/index.d.ts"/>
const giveCard = __importStar(require("./giveCard"));
const firebase = __importStar(require("firebase"));
const http = __importStar(require("http"));
const socket_io_1 = __importDefault(require("socket.io"));
const express = require("express");
const jwt = require("jsonwebtoken");
const app = express(), FIREBASE_CONFIG = {
    apiKey: "AIzaSyC6V5XWXQCC_zdGWsXPND4OVpwYGS7VsAE",
    authDomain: "buyao-70f4a.firebaseapp.com",
    databaseURL: "https://buyao-70f4a.firebaseio.com",
    projectId: "buyao-70f4a",
    storageBucket: "buyao-70f4a.appspot.com",
    messagingSenderId: "409751210552"
}, card = [0, 1];
let http2 = new http.Server(app);
let mainSocket = socket_io_1.default(http2);
// 生日快樂啦!
firebase.initializeApp(FIREBASE_CONFIG);
http2.listen(process.env.PORT || 48763, () => {
    console.log("Server listening on :" + process.env.PORT);
});
// 現在createRoom join_room執行時需附帶auth成功時返回的token
// 否則function不會執行，直接回傳status 403
mainSocket.on("connection", (socket) => {
    socket.room = "";
    socket.token = "";
    socket.GameStatus = "";
    socket.on("test", (data) => {
        // mainSocket.to(socket.id).emit("test", socket.id);
        mainSocket.socket(socket.id).emit(socket.id);
    });
    socket.on("disconnect", () => {
        mainSocket.to(socket.id).emit("disconnected");
        // socket.emit("test", "ru disconnected?");
    });
    socket.on("auth", (data) => {
        function loginProcess() {
            return new Promise((res, rej) => {
                firebase.auth().signInWithEmailAndPassword(data.email, data.password)
                    .then(() => {
                    const profileForToken = { email: data.email, password: data.password };
                    const token = jwt.sign(profileForToken, "token", {
                        expiresIn: 60 * 60 * 24
                    });
                    socket.token = token;
                    firebase.auth().onAuthStateChanged((user) => {
                        if (user) {
                            firebase.database().ref(`/users/${user.uid}/`).once("value", (snap) => {
                                const transferData = {
                                    type: "success", code: "default", token, nickname: snap.val(),
                                    email: data.email, uid: user.uid
                                };
                                res(transferData);
                            });
                        }
                    });
                })
                    // todo: 登入完之後煩到 firebase 抓取使用者的 nickname 跟 email 再 emit 回來，感恩
                    // todo: 再加一個 uid 感恩。
                    .catch((error) => {
                    const errorCode = error.code;
                    const transferData = { type: "error", code: `${errorCode}` };
                    rej(transferData);
                });
            });
        }
        function executeLoginProcess() {
            return __awaiter(this, void 0, void 0, function* () {
                yield loginProcess().then((fulfilled) => {
                    console.log(socket.id);
                    // mainSocket.socket(socket.id).emit(fulfilled);
                    mainSocket.to(socket.id).emit("auth", fulfilled);
                }).catch((rejected) => {
                    // mainSocket.socket(socket.id).emit(rejected);
                    mainSocket.to(socket.id).emit("auth", rejected);
                });
            });
        }
        executeLoginProcess();
    });
    socket.on("register", (data) => {
        function registerProcess() {
            return new Promise((res, rej) => {
                firebase.auth().createUserWithEmailAndPassword(data.email, data.password)
                    .then(() => {
                    firebase.auth().signInWithEmailAndPassword(data.email, data.password)
                        .then(() => {
                        console.log("Ready to push player nickName");
                        firebase.auth().onAuthStateChanged((user) => {
                            console.log(user.uid);
                            firebase.database().ref("/users/").child(user.uid).update({ name: data.nickname });
                            const transferData = {
                                type: "success", code: "default", email: data.email,
                                nickname: data.nickname, uid: user.uid
                            };
                            res(transferData);
                        });
                    });
                })
                    .catch((error) => {
                    let errorCode = error.code;
                    const transferData = { type: "error", code: `${errorCode}` };
                    rej(transferData);
                });
            });
        }
        function executeRegisterProcess() {
            return __awaiter(this, void 0, void 0, function* () {
                yield registerProcess()
                    .then((fulfilled) => {
                    socket.emit("auth", fulfilled);
                })
                    .catch((rejected) => {
                    // mainSocket.socket(socket.id).emit(rejected);
                    socket.emit("error", rejected);
                });
            });
        }
        executeRegisterProcess();
    });
    // todo: 另外那個 註冊的時候往 firebase 推 mail 的話會有命名規範的問題（不可以有.)，再一起想看看怎麼處理，感恩。
    // todo: 註冊的時候順便往 firebase 的 users/${userEmail} 底下推暱稱，接的格式用 data.nickname，感謝。
    // todo: 註冊的時候順便網 firebase 的 users/${userEmail} 底下推ＵＩＤ，接的格式用 data.uid，感謝。
    // uID 看你要自己做還是抓 firebase 的UID，總之我做登入的時候記得要丟回來給我就好。
    socket.on("logout", () => {
        firebase.auth().signOut()
            .then(() => {
            // mainSocket.socket(socket.id).emit({ type: "success", code: "default" });
            mainSocket.to(socket.id).emit("logout", { type: "success", code: "default" });
            socket.token = "";
        })
            .catch((error) => {
            // mainSocket.socket(socket.id).emit({ type: "error", code: `${error.code}` });
            mainSocket.to(socket.id).emit("logout", { type: "error", code: `${error.code}` });
        });
    });
    socket.on("createRoom", (data) => {
        console.log(`createRoom ${JSON.stringify(data)}`);
        // 創立房間、隨機生成id並加入
        // 加入後將id返回客戶端om
        // 其實你可以先 const ROOM_PATH = firebase.database().ref('/rooms/')
        // 然後再 let roomKey: string = ROOM_PATH.push({ id: id, room: data }).key;
        // 或是你想過直接把 id 做成路徑？
        // 像 firebase.database().ref(`/rooms/${id}`)
        const path = firebase.database().ref(`/room/`).child(data.uid);
        const playerPath = firebase.database().ref(`/room/${data.uid}/player`);
        const nickNamePath = firebase.database().ref(`/users/${data.uid}`);
        let nickName = "";
        let playerData = {};
        nickNamePath.once("value", (snap) => {
            nickName = snap.val().name;
        })
            .then(() => {
            console.log(`create ${nickName}`);
            path.set({
                room: data.roomId,
                player: {}
            });
            playerPath.push({
                uid: data.uid,
                nickName: nickName,
                host: true,
                readyStatus: true,
                socketId: data.socketId
            }).then(() => {
                playerPath.once("value", (snap) => {
                    playerData = snap.val();
                }).then(() => {
                    nickNamePath.once("value", (snap) => {
                        mainSocket.to(socket.id).emit("createRoom", {
                            host: true, id: data.uid, nickName: snap.val().name,
                            player: playerData, room: data.roomId, readyStatus: true
                        });
                    });
                });
            }).catch((err) => {
                console.log(err);
            });
        });
        socket.join(data.uid);
        // 這裡測試用，我加了 'room': data, 不對的話可以自行刪除。
    });
    socket.on("getRoomList", (data) => {
        firebase.database().ref("/room/").once("value", snap => {
            mainSocket.emit("getRoomList", snap.val());
        });
    });
    socket.on("joinRoom", (data) => {
        // 加入其他玩家所創的Room
        // 並將Room內在線人數傳回
        console.log(`joinRoom ${JSON.stringify(data)}`);
        socket.join(data.roomId);
        let error = false;
        let room = "";
        const playerPath = firebase.database().ref(`/room/${data.roomId}/player`);
        const roomPath = firebase.database().ref(`/room/${data.roomId}`);
        const nickNamePath = firebase.database().ref(`/users/${data.userId}/`);
        let nickName = "";
        nickNamePath.once("value", (snap) => {
            nickName = snap.val().name;
        })
            .then(() => {
            playerPath.push({ host: false, nickName: nickName, readyStatus: false, uid: data.userId, socketId: data.socketId });
            playerPath.once("value", (snap) => {
                // mainSocket.socket(socket.id).emit(snap.val());
                // socket.broadcast.to(data.roomId).emit("updateRoomerStatus", {type: "join", player: snap.val()});
                mainSocket.to(data.roomId).emit("updateRoomerStatus", { type: "join", player: snap.val() });
                roomPath.once("value", (snap) => { room = snap.val().room; });
                mainSocket.to(socket.id).emit("joinRoom", {
                    type: "join", host: false, nickName: nickName, player: snap.val(),
                    readyStatus: false, room: room, id: data.roomId
                });
                if (snap.val().length >= 4) {
                    // mainSocket.socket(socket.id).emit("error");
                    mainSocket.to(socket.id).emit("error");
                    error = true;
                    return error;
                }
            });
            if (error === true) {
                return;
            }
            nickNamePath.once("value", (snap) => {
                nickName = snap.val().name;
            });
            roomPath.once("value", (snap) => {
                socket.room = snap.val().room;
            });
        });
        // mainSocket.to(socket.id).emit("joinRoom", "Player joined!");
        // todo: 往 firebase 也推一下吧？我不確定你的房間的系統架構到底長怎樣...
        // todo: 記得往我這邊也丟一下資料，原本就在房間的人也更新一下資料。
    });
    socket.on("InGameChat", (data) => {
        if (data.senderName && data.content) {
            mainSocket.emit("InGameChat", { name: data.senderName, content: data.content });
        }
    });
    // todo: 返回一下玩家列表、房主token，再寫一個在房間裡面準備（大家都準備好房主才能按開始）的功能，像這樣寫。
    // 玩家列表的格式為： { nickname: '', uid: '', ready: false, master: false, self: false } 有其他的你再加寫。
    socket.on("exitRoom", (data) => {
        console.log(`exitRoom ${data}`);
        const removePlayer = firebase.database().ref(`/room/${data.roomId}/player/${data.index}`);
        const playerPath = firebase.database().ref(`/room/${data.roomId}/player/`);
        removePlayer.remove();
        playerPath.once("value", (snap) => {
            // socket.broadcast.to(data.roomId).emit("updateRoomerStatus", {type: "exit", player: snap.val()});
            mainSocket.to(data.roomId).emit("updateRoomerStatus", { type: "exit", player: snap.val() });
            socket.emit("updateRoomerStatus", { type: "exit", player: snap.val() });
        });
        socket.leave(data.roomId);
        // firebase.database().ref("/rooms/").child(data).remove();
    });
    // socket.on("userStatus", (data : any) => {
    //   firebase.auth().onIdTokenChanged((user :any) => {
    //     if (user) {
    //       let transferData : object = {email : user.email, uid : user.uid};
    //       mainSocket.socket(data.clientId).emit({data : transferData, id : socket.id});
    //       // mainSocket.to(data.clientId).emit("userStatus", {data : transferData, id : socket.id});
    //     }
    //   });
    // firebase.auth().onAuthStateChanged((user) => {
    //   if (user) {
    //     firebase.database().ref("/users/").child(user.uid).once("value", snap => {
    //       socket.emit("userStatus", { email: user.email, uid: user.uid, nickname: snap.val()});
    //     });
    //   } else {
    //     socket.emit("userStatus", { login: false });
    //   }
    // });
    // });
    socket.on("gameStart", (data) => {
        // 接到房主gameStart，往該房間內所有人推送gameStart(只由房主發送過來，其餘只接收)
        // 請帶data.host，將作為是否創建status, gameInfo之依據
        let playerStatus = [
            {
                id: 0,
                handCard: [],
                turn: true,
                uid: "",
                life: 4,
                socketId: "",
                nickName: "",
                dead: false
            },
            {
                id: 1,
                handCard: [],
                turn: false,
                uid: "",
                life: 4,
                socketId: "",
                nickName: "",
                dead: false
            },
            {
                id: 2,
                handCard: [],
                turn: false,
                uid: "",
                life: 4,
                socketId: "",
                nickName: "",
                dead: false
            },
            {
                id: 3,
                handCard: [],
                turn: false,
                uid: "",
                life: 4,
                socketId: "",
                nickName: "",
                dead: false
            }
        ];
        function setGameStatus() {
            return new Promise((res, rej) => {
                const roomPath = firebase.database().ref("/room/");
                firebase.database().ref(`/room/${data.roomId}/player`).once("value", (snap) => {
                    let counter = 0;
                    Object.keys(snap.val()).forEach((index) => {
                        // 抓玩家資料
                        playerStatus[counter].uid = snap.val()[index].uid;
                        playerStatus[counter].socketId = snap.val()[index].socketId;
                        playerStatus[counter].nickName = snap.val()[index].nickName;
                        playerStatus[counter].handCard = giveCard.getRandom(card, 6);
                        counter += 1;
                    });
                })
                    .then(() => {
                    roomPath.child(data.roomId).update({
                        status: "Started",
                        gameInfo: {
                            playerStatus
                        }
                    })
                        .then(() => {
                        const result = { gameStartResult: "successful" };
                        res(result);
                    })
                        .catch((err) => {
                        const resultErr = err;
                        rej(resultErr);
                    });
                });
            });
        }
        function executeGameStartProcess() {
            return __awaiter(this, void 0, void 0, function* () {
                yield setGameStatus()
                    .then((fulfilled) => {
                    socket.broadcast.to(data.roomId).emit("gameStart", { fulfilled, playerStatus: playerStatus });
                    socket.emit("gameStart", { fulfilled, playerStatus: playerStatus });
                })
                    .catch((rejected) => {
                    socket.broadcast.to(data.roomId).emit("error", rejected);
                });
            });
        }
        if (data.host === true) {
            executeGameStartProcess();
        }
    });
    // roomId & ans & userInGameId
    socket.on("defAns", (data) => {
        firebase.database().ref(`room/${data.roomId}/gameInfo/playerStatus/`).once("value", (snap) => {
            let playerStatus = snap.val();
            if (data.ans === true) {
                playerStatus[Number(data.userInGameId)].handCard.splice(data.usingCard, 1);
                firebase.database().ref(`/room/`).child(data.roomId).update({
                    status: "inRound",
                    gameInfo: {
                        playerStatus
                    }
                })
                    .then(() => {
                    mainSocket.in(data.roomId).emit("getBattleStatus", { playerStatus: playerStatus });
                });
                mainSocket.in(data.roomId).emit("battleLoading", "");
            }
            if (data.ans === false) {
                let playerLife = playerStatus[+data.userInGameId].life;
                playerStatus[Number(data.userInGameId)].life = playerLife - 1;
                if (playerStatus[Number(data.userInGameId)].life === 0) {
                    playerStatus[Number(data.userInGameId)].dead = true;
                    mainSocket.to(data.socketId).emit("dead");
                }
                firebase.database().ref(`/room/`).child(data.roomId).update({
                    status: "inRound",
                    gameInfo: {
                        playerStatus
                    }
                })
                    .then(() => {
                    mainSocket.in(data.roomId).emit("getBattleStatus", { playerStatus: playerStatus });
                });
                mainSocket.in(data.roomId).emit("battleLoading", "");
            }
        });
    });
    socket.on("turnEnd", (data) => {
        let whoIsNext = data.inGameId + 1 > 3 ? (data.inGameId - 4) + 1 : data.inGameId + 1;
        firebase.database().ref(`/room/${data.roomId}/gameInfo/playerStatus/`).once("value", (snap) => {
            let playerStatus = snap.val();
            playerStatus[data.inGameId].turn = false;
            if (playerStatus[whoIsNext].dead === true) {
                playerStatus[whoIsNext + 1].turn = true;
                playerStatus[whoIsNext + 1].handCard.push(giveCard.getRandom(card, 1));
            }
            else {
                playerStatus[whoIsNext].turn = true;
                playerStatus[whoIsNext].handCard.push(giveCard.getRandom(card, 1));
            }
            firebase.database().ref(`/room/`).child(data.roomId).update({
                status: "inRound",
                gameInfo: {
                    playerStatus
                }
            })
                .then(() => {
                mainSocket.in(data.roomId).emit("getBattleStatus", { playerStatus: playerStatus });
            });
        });
    });
    socket.on("useCard", (data) => {
        firebase.database().ref(`/room/${data.roomId}/gameInfo/playerStatus/`).once("value", (snap) => {
            let playerStatus = snap.val();
            switch (snap.val()[data.cardUserInGameId].handCard[data.usingCard]) {
                // 0為攻擊
                case 0: {
                    playerStatus[data.cardUserInGameId].handCard.splice(data.usingCard, 1);
                    mainSocket.to(playerStatus[data.targetUserInGameId].socketId).emit("def", "");
                    mainSocket.in(data.roomId).emit("battleLoading", "");
                    firebase.database().ref(`/room/`).child(data.roomId).update({
                        status: "inRound",
                        gameInfo: {
                            playerStatus
                        }
                    })
                        .then(() => {
                        mainSocket.in(data.roomId).emit("getBattleStatus", { playerStatus: playerStatus });
                    });
                }
            }
        });
    });
    socket.on("drawCard", () => {
        socket.card = giveCard.getRandom(card, 1);
    });
    // todo: 那個 初始抽牌的部分是根據玩家抽到的角色卡血量來決定應該抽多少張，所以你可能還要再寫一個發角色卡
    // todo: 然後再寫一個每回合的抽卡，感謝。
    // 你可以這樣寫
    // 	socket.on('DrawCard', (data) => {
    // 		let CardCount = 0;
    // 		while(true){
    // 			let send = card[Math.floor(Math.random() * card.length)];
    // 			socket.emit('DrawCard', send);
    // 			cardCount ++;
    // 			if (CardCount === data.life) break;
    // 		}
    // 	});
    // 另外無窮迴圈盡量少用，感恩。
    // todo: 記得寫個 gameStart ， 它返回使用者在遊戲裡面的id (1~4), emit 給 client 端，感謝。
    // 要丟回來的有 player: [{
    //   id: 0,
    //   charCard: 0,
    //   life: 0,
    //   handCard: [{id: 1},{id: 2},{id: 3},{id: 4}]
    // },{
    //   id: 1,
    //   charCard: 2,
    //   life: 3,
    //   handCard: [{id: 1},{id: 2},{id: 3},{id: 4}]},{
    //   id: 2,
    //   charCard: 0,
    //   life: 0,
    //   handCard: [{id: 1},{id: 2},{id: 3},{id: 4}]
    // },{
    //   id: 3,
    //   charCard: 0,
    //   life: 0,
    //   handCard: [{id: 1},{id: 2},{id: 3},{id: 4}]
    // }]
    // 以上資料希望可以實時更新，每次有玩家對這場遊戲觸發任何事件都丟回來。
    socket.on("gameOver", () => {
        socket.leave(socket.room);
        socket.room = "";
    });
    socket.on("ShutdownSignal", () => {
        socket.emit("Server is going down in five minutes");
        socket.broadcast.emit("Server is going down in five minutes");
        setTimeout(ShutDownProcess, 300000);
        function ShutDownProcess() {
            process.exit(0);
        }
    });
});
// todo: 規則在這邊，煩請詳閱。'https://zh.wikipedia.org/wiki/砰！#基本版遊戲概要'
//# sourceMappingURL=Server.js.map