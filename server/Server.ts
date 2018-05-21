const express = require('express'),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http),
	firebase = require('firebase'),
	jwt = require('jsonwebtoken'),
	firebase_config = {
		apiKey: "AIzaSyC6V5XWXQCC_zdGWsXPND4OVpwYGS7VsAE",
		authDomain: "buyao-70f4a.firebaseapp.com",
		databaseURL: "https://buyao-70f4a.firebaseio.com",
		projectId: "buyao-70f4a",
		storageBucket: "buyao-70f4a.appspot.com",
		messagingSenderId: "409751210552"

	};

firebase.initializeApp(firebase_config);

http.listen(process.env.PORT || 48763, () => {
	console.log('Computer listening on :' + process.env.PORT);
});

//現在create_room join_room執行時需附帶auth成功時返回的token
//否則function不會執行，直接回傳status 403
io.on('connection', (socket) => {
	socket.room = "";
	socket.token = "";
	socket.GameStatus = "";
	let room_id = [],
		unique_key = [];

	socket.on('test', (data) => {
		console.log(data);
		io.emit('test', `success ${data.split(' ').reverse()}`)
	});

	socket.on('disconnect', () => {
		console.log('say goodbye');
		io.emit('test', "ru disconnected?")
	});

	socket.on('auth', (data) => {
		console.log(`get login data from ${data.email}, start auth process..`);
		firebase.auth().signInWithEmailAndPassword(data.email, data.password)
			.then(() => {
				//創立一個token，往後執行動作皆需附帶此token，否則傳回403 error
				let ProfileForToken = {email: data.email, password:data.password},
				token = jwt.sign(ProfileForToken, 'token', {
					expiresIn: 60*60*24
				});
				socket.token = token;
				io.emit('auth', {type: 'success', code: 'default', token: token});
			})
			.catch((error) => {
				let errorCode = error.code;
				io.emit('auth', {type: 'error', code: `${errorCode}`});
			})
	});

	socket.on('register', (data) => {
		console.log(`we've received register signal from ${data.email}, start register process...`);
		console.log(data.email, data.password);
		io.emit('test', "we got it:)");
		firebase.auth().createUserWithEmailAndPassword(data.email, data.password)
			.then(() => {
				io.emit('reg', {type: 'success', code: 'default'});
			})
			.catch((error) => {
				// 處理錯誤區塊
				let errorCode = error.code;
				io.emit('reg', {type: 'error', code: `${errorCode}`});
			});
	});

	socket.on('logout', (data) => {
	  console.log(`We've received logout signal from ${data.email}, star logout process...`);
		firebase.auth().signOut()
			.then(() => {
				io.emit('logout', {type: 'success', code: 'default'});
				socket.token = "";
			})
			.catch((error) => {
				io.emit('logout', {type: 'error', code: `${error.code}`});
			})
	});

	socket.on('create_room', () => {
		//創立房間、隨機生成id並加入
		//加入後將id返回客戶端om
			let id: string = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
			socket.join(id);
			io.to(id).emit('create_room', id);
			//roomID會被存放在每個unique-id底下
			//透過key() 來得到
			//傳送的data作為遊戲室名稱
			let RoomKey: string = firebase.database().ref('rooms').push({id: id}).key;
			console.log(RoomKey);
			room_id.push(id);
			unique_key.push(RoomKey);
			//RoomKey為將來遊戲中寫入相關資料時，直接對到此表單
	});

	socket.on('join_room', (data) => {
		//加入其他玩家所創的Room
		//並將Room內在線人數傳回
			socket.join(data.roomId);
			io.to(data.roomId).emit('Player joined!');
			console.log(`Now we have ${io.sockets.clients(data.roomId)} clients in ${data.roomId}`);
			socket.room = data.roomId;
			if(io.sockets.clients(data.roomId) == 4){
				socket.status = 1;
				console.log(`Room ${io.sockets.clients(data.roomId)} reached maximum players`);
				io.to(data.roomId).emit("We've got enough players, time to start game!");
			}
	});

	socket.on('InGameChat', (data) => {
		if (data.name && data.content){
			io.emit('InGameChat', {name: data.name, content: data.content});
		}
	});

	socket.on('GameOver', () => {
		socket.leave(socket.room);
		socket.room = "";
	});

});