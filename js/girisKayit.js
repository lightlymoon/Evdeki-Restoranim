const firebaseConfig = {
    apiKey: "",
    authDomain: "evdeki-restoranim-1.firebaseapp.com",
    projectId: "evdeki-restoranim-1",
    storageBucket: "evdeki-restoranim-1.firebasestorage.app",
    messagingSenderId: "238625102318",
    appId: "1:238625102318:web:449783527cdb6fcc8656ff",
    measurementId: "G-EK97FS901E"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => container.classList.add("active"));
loginBtn.addEventListener('click', () => container.classList.remove("active"));

function setupPasswordToggle(iconId, inputId) {
    const icon = document.getElementById(iconId);
    const input = document.getElementById(inputId);
    if (icon && input) {
        icon.addEventListener('click', () => {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            icon.classList.toggle('bx-show');
            icon.classList.toggle('bx-hide');
        });
    }
}
setupPasswordToggle('toggleRegPasswordIcon', 'regPassword');
setupPasswordToggle('toggleLoginPasswordIcon', 'loginPassword');

window.signUpUser = async () => {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPassword').value;

    const nameError = document.getElementById('nameError');
    const passError = document.getElementById('passError');

    nameError.style.display = "none";
    passError.style.display = "none";

    const nameRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]{3,}$/;
    if (!nameRegex.test(name)) {
        nameError.style.display = "block";
        return;
    }

    const passRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passRegex.test(pass)) {
        passError.style.display = "block";
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
        const user = userCredential.user;

        await user.updateProfile({ displayName: name });

        await db.collection("users").doc(user.uid).set({
            name: name,
            email: email,
            highScore: 0
        });

        window.location.href = "index.html";

    } catch (error) {
        alert("Kayıt hatası: " + error.message);
    }
};

window.signInUser = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('errorMsg');

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, pass);
        if (userCredential.user.emailVerified) {
            window.location.href = "index.html";
        } else {
            alert("Lütfen e-posta adresinizi doğrulayın!");
            await auth.signOut();
        }
    } catch (error) {
        errorMsg.style.display = "block";
    }
};

window.signInWithGoogle = async () => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        const doc = await db.collection("users").doc(user.uid).get();
        if (!doc.exists) {
            await db.collection("users").doc(user.uid).set({
                name: user.displayName || "Kullanıcı",
                email: user.email,
                highScore: 0
            });
        }

        window.location.href = "index.html";
    } catch (error) {
        alert("Google giriş hatası: " + error.message);
    }
};
