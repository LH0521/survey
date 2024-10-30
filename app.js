const firebaseConfig = {
    apiKey: "AIzaSyABS6LjgA3zNJTcW8RI2ho6Yr5LPr21HR0",
    authDomain: "survey-13b04.firebaseapp.com",
    projectId: "survey-13b04",
    storageBucket: "survey-13b04.firebasestorage.app",
    messagingSenderId: "572633015937",
    appId: "1:572633015937:web:ba4f35a294d15d173a4f80"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Authentication listener
auth.onAuthStateChanged(user => {
    if (user) {
        showPollsPage();
        loadPolls();
    } else {
        showLandingPage();
        clearPolls();
    }
});

// Display functions
function showLandingPage() {
    document.getElementById('landingPage').style.display = 'block';
    document.getElementById('pollsPage').style.display = 'none';
}

function showPollsPage() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('pollsPage').style.display = 'block';
}

// Load polls and clear polls functions
async function loadPolls() {
    clearPolls(); // Clear polls before loading

    const pollsContainer = document.getElementById('pollsContainer');
    const pollsSnapshot = await db.collection('polls').get();
    pollsSnapshot.forEach(doc => {
        const pollData = doc.data();
        const pollCard = createPollCard(doc.id, pollData);
        pollsContainer.appendChild(pollCard);
    });
}

function clearPolls() {
    document.getElementById('pollsContainer').innerHTML = '';
}

// Create poll card
function createPollCard(id, data) {
    const card = document.createElement('div');
    card.classList.add('card', 'mb-4');
    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${data.question}</h5>
            ${Object.keys(data.options).map(optionKey => `
                <button class="btn btn-outline-primary w-100 my-1" onclick="vote('${id}', '${optionKey}')">
                    ${optionKey} <span id="progress-${id}-${optionKey}">0%</span>
                </button>
            `).join('')}
        </div>
    `;
    return card;
}

// Voting function
async function vote(pollId, optionKey) {
    const user = auth.currentUser;
    const pollRef = db.collection('polls').doc(pollId);

    // Update vote: remove user from all options and add to the selected option
    const pollDoc = await pollRef.get();
    const pollData = pollDoc.data();

    for (const key in pollData.options) {
        if (pollData.options[key].includes(user.uid)) {
            await pollRef.update({
                [`options.${key}`]: firebase.firestore.FieldValue.arrayRemove(user.uid)
            });
        }
    }
    await pollRef.update({
        [`options.${optionKey}`]: firebase.firestore.FieldValue.arrayUnion(user.uid)
    });

    updatePollProgress(pollId); // Update progress display after voting
}

// Function to update poll progress
async function updatePollProgress(pollId) {
    const pollDoc = await db.collection('polls').doc(pollId).get();
    const pollData = pollDoc.data();

    const totalVotes = Object.values(pollData.options).reduce((sum, voters) => sum + voters.length, 0);

    for (const [key, voters] of Object.entries(pollData.options)) {
        const percentage = totalVotes ? (voters.length / totalVotes * 100).toFixed(0) : 0;
        document.getElementById(`progress-${pollId}-${key}`).innerText = `${percentage}%`;
    }
}

// Login and logout functionality
document.getElementById('loginBtn').onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => console.error("Login failed:", error));
};

document.getElementById('logoutBtn').onclick = () => {
    auth.signOut().catch(error => console.error("Logout failed:", error));
};