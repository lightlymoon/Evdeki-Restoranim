(function () {
  console.log('game.js v2 - bombs independent');
  var firebaseConfig = {
    apiKey: "AIzaSyAII5NbG7hFd0lItCsOwnoVdYWXzc5ztyE",
    authDomain: "evdeki-restoranim-1.firebaseapp.com",
    projectId: "evdeki-restoranim-1",
    storageBucket: "evdeki-restoranim-1.firebasestorage.app",
    messagingSenderId: "238625102318",
    appId: "1:238625102318:web:449783527cdb6fcc8656ff",
    measurementId: "G-EK97FS901E"
  };

  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  var auth = typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null;
  var db = typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null;
  console.log('game.js init auth:', !!auth, 'db:', !!db);

  var gameArea = document.getElementById('game-area');
  var player = document.getElementById('player');
  var scoreElement = document.getElementById('score');
  var finalScoreElement = document.getElementById('final-score');
  var gameOverScreen = document.getElementById('game-over');
  var highScoreDisplay = document.getElementById('highScoreDisplay');
  var gameOverHighScore = document.getElementById('gameOverHighScore');

  var areaWidth, areaHeight, areaRect;
  var playerWidth = 60;
  var playerX, playerY;
  var velocityY = 0;
  var gravity = 0.4;
  var jumpStrength = -11;
  var score = 0;
  var isGameOver = false;
  var platforms = [];
  var animationId;
  var currentUser = null;
  var highScore = 0;

  var boostTimer = 0;

  var ITEM_TYPES = ['strawberry', 'cheese', 'brownie', 'cookies'];
  var bombs = [];
  var bombSpawnCounter = 0;
  var MAX_BOMBS = 5;
  var ITEM_IMGS = {
    strawberry: 'çilek.png',
    cheese: 'peynir.png',
    bomb: 'bomb.png',
    brownie: 'brownie.png',
    cookies: 'cookies.png'
  };

  var pendingMoveX = null;

  function resizeGame() {
    areaWidth = gameArea.offsetWidth;
    areaHeight = gameArea.offsetHeight;
    areaRect = gameArea.getBoundingClientRect();
    if (!playerX) playerX = areaWidth / 2 - (playerWidth / 2);
  }

  window.addEventListener('resize', resizeGame);
  resizeGame();

  function getLocalHighScore() {
    return parseInt(localStorage.getItem('mutfakPanikHighScore') || '0', 10);
  }

  if (auth) {
    auth.onAuthStateChanged(function (user) {
      console.log('game.js onAuthStateChanged user:', user ? user.uid : null);
      currentUser = user;
      if (user && db) {
        loadHighScore(user);
      } else if (user && !db) {
        console.warn('game.js Firestore not available, using localStorage');
        highScore = getLocalHighScore();
        updateHighScoreUI();
      } else {
        highScore = getLocalHighScore();
        updateHighScoreUI();
      }
    });
  } else {
    highScore = getLocalHighScore();
    updateHighScoreUI();
  }

  function loadHighScore(user) {
    if (!db) { highScore = getLocalHighScore(); updateHighScoreUI(); return; }
    db.collection('users').doc(user.uid).get()
      .then(function (doc) {
        console.log('game.js loadHighScore doc.exists:', doc.exists, 'data:', doc.data());
        if (doc.exists && typeof doc.data().highScore === 'number') {
          highScore = doc.data().highScore;
        } else {
          highScore = getLocalHighScore();
        }
        updateHighScoreUI();
      })
      .catch(function (err) {
        console.error('game.js loadHighScore error:', err);
        highScore = getLocalHighScore();
        updateHighScoreUI();
      });
  }

  function updateHighScoreUI() {
    if (highScoreDisplay) highScoreDisplay.textContent = highScore;
    if (gameOverHighScore) gameOverHighScore.textContent = highScore;
  }

  function saveHighScore(newScore) {
    var prevLocal = getLocalHighScore();
    if (newScore > prevLocal) {
      localStorage.setItem('mutfakPanikHighScore', newScore);
    }
    highScore = newScore;
    updateHighScoreUI();

    if (currentUser && db) {
      db.collection('users').doc(currentUser.uid).set({ highScore: newScore }, { merge: true })
        .then(function () { console.log('game.js score saved to Firestore:', newScore); })
        .catch(function (e) { console.error('game.js Firestore score save failed:', e); });
    } else {
      console.warn('game.js cannot save to Firestore, currentUser:', !!currentUser, 'db:', !!db);
    }
  }

  class Platform {
    constructor(y) {
      this.w = 80;
      this.h = 15;
      this.x = Math.random() * (areaWidth - this.w);
      this.y = y;
      this.visual = document.createElement('div');
      this.visual.className = 'platform';
      this.itemVis = null;
      this.itemType = null;
      this.hasItem = false;
      this.render();
      gameArea.appendChild(this.visual);
      this.tryAddItem();
    }
    render() {
      this.visual.style.left = this.x + 'px';
      this.visual.style.top = (areaHeight - this.y) + 'px';
      if (this.itemVis) {
        this.itemVis.style.left = (this.x + (this.w - 24) / 2) + 'px';
        this.itemVis.style.top = (areaHeight - this.y - 28) + 'px';
      }
    }
    tryAddItem() {
      if (Math.random() < 0.4) {
        var key = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
        if (key === 'bomb') key = 'strawberry';
        this.itemType = key;
        this.itemVis = document.createElement('div');
        this.itemVis.className = 'item';
        this.itemVis.style.backgroundImage = 'url(./css/assets/' + ITEM_IMGS[key] + ')';
        gameArea.appendChild(this.itemVis);
        this.hasItem = true;
        this.render();
      }
    }
    removeItem() {
      if (this.itemVis && this.itemVis.parentNode) {
        this.itemVis.parentNode.removeChild(this.itemVis);
      }
      this.itemVis = null;
      this.itemType = null;
      this.hasItem = false;
    }
  }

  function spawnBomb() {
    if (bombs.length >= MAX_BOMBS) return;
    var b, tries = 0;
    do {
      b = {
        x: 20 + Math.random() * (areaWidth - 60),
        y: 20 + Math.random() * (areaHeight * 0.85),
        el: null
      };
      tries++;
    } while (tries < 30 && platforms.some(function (p) {
      return b.x + 28 > p.x && b.x < p.x + p.w && Math.abs(p.y - b.y) < 60;
    }));
    b.el = document.createElement('div');
    b.el.className = 'item';
    b.el.style.backgroundImage = 'url(./css/assets/' + ITEM_IMGS.bomb + ')';
    b.el.style.left = b.x + 'px';
    b.el.style.top = (areaHeight - b.y) + 'px';
    gameArea.appendChild(b.el);
    bombs.push(b);
  }

  function removeBomb(b) {
    var idx = bombs.indexOf(b);
    if (idx > -1) bombs.splice(idx, 1);
    if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el);
  }

  function initPlatforms() {
    platforms = [];
    for (var i = 0; i < 7; i++) {
      platforms.push(new Platform(100 + i * (areaHeight / 7)));
    }
    platforms[0].x = playerX;
    platforms[0].render();
    playerY = platforms[0].y + platforms[0].h;
  }

  function update() {
    if (isGameOver) return;

    if (pendingMoveX !== null) {
      playerX = pendingMoveX;
      pendingMoveX = null;
    }

    if (boostTimer > 0) {
      boostTimer--;
      velocityY += gravity * 0.5;
      playerY -= velocityY * 1.3;
    } else {
      velocityY += gravity;
      playerY -= velocityY;
    }

    if (playerY > areaHeight / 2) {
      var diff = playerY - areaHeight / 2;
      playerY = areaHeight / 2;
      platforms.forEach(function (p) {
        p.y -= diff;
        if (p.y < 0) {
          p.removeItem();
          p.y = areaHeight;
          p.x = Math.random() * (areaWidth - p.w);
          p.tryAddItem();
          score++;
          scoreElement.textContent = score;
        }
      });
      for (var bi = bombs.length - 1; bi >= 0; bi--) {
        bombs[bi].y -= diff;
        if (bombs[bi].y < -50) removeBomb(bombs[bi]);
      }
    }

    bombSpawnCounter++;
    if (bombSpawnCounter >= 60 && bombs.length < MAX_BOMBS) {
      bombSpawnCounter = 0;
      if (Math.random() < 0.3) spawnBomb();
    }

    if (velocityY > 0 && boostTimer === 0) {
      platforms.forEach(function (p) {
        if (
          playerX + (playerWidth - 10) > p.x &&
          playerX + 10 < p.x + p.w &&
          playerY > p.y &&
          playerY < p.y + p.h + 10
        ) {
          velocityY = jumpStrength;
          if (p.hasItem) {
            boostTimer = 40;
            p.removeItem();
          }
        }
      });
    }

    for (var j = bombs.length - 1; j >= 0; j--) {
      var b = bombs[j];
      if (
        playerX + (playerWidth - 10) > b.x &&
        playerX + 10 < b.x + 28 &&
        playerY > b.y - 10 &&
        playerY < b.y + 28 + 10
      ) {
        velocityY = 15;
        removeBomb(b);
      }
    }

    if (playerY < -50) {
      endGame();
    }

    player.style.transform = 'translate(' + playerX + 'px, ' + (areaHeight - playerY - playerWidth) + 'px)';
    platforms.forEach(function (p) { p.render(); });
    bombs.forEach(function (b) {
      b.el.style.left = b.x + 'px';
      b.el.style.top = (areaHeight - b.y) + 'px';
    });
    animationId = requestAnimationFrame(update);
  }

  function handleMove(e) {
    if (isGameOver) return;
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var newX = clientX - areaRect.left - (playerWidth / 2);
    if (newX < 0) newX = 0;
    if (newX > areaWidth - playerWidth) newX = areaWidth - playerWidth;
    pendingMoveX = newX;
  }

  gameArea.addEventListener('mousemove', handleMove);
  gameArea.addEventListener('touchmove', function (e) {
    if (isGameOver) return;
    e.preventDefault();
    handleMove(e);
  }, { passive: false });
  gameArea.addEventListener('touchstart', function (e) {
    if (isGameOver) return;
    e.preventDefault();
    handleMove(e);
  }, { passive: false });

  function endGame() {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    gameOverScreen.style.display = 'flex';
    finalScoreElement.textContent = score;
    if (score > highScore) {
      saveHighScore(score);
    } else {
      var local = getLocalHighScore();
      if (score > local) localStorage.setItem('mutfakPanikHighScore', score);
      updateHighScoreUI();
    }
    platforms.forEach(function (p) { p.removeItem(); });
    for (var k = bombs.length - 1; k >= 0; k--) removeBomb(bombs[k]);
  }

  window.resetGame = function resetGame() {
    location.reload();
  };

  initPlatforms();
  update();
})();
