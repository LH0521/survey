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

document.getElementById('loginBtn').onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(showPollsPage);
};

document.getElementById('logoutBtn').onclick = () => {
    auth.signOut().then(showLandingPage);
};

auth.onAuthStateChanged(user => {
    if (user) showPollsPage();
    else showLandingPage();
});

function showLandingPage() {
    document.getElementById('landingPage').style.display = 'block';
    document.getElementById('pollsPage').style.display = 'none';
}

function showPollsPage() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('pollsPage').style.display = 'block';
    loadPolls();
}

async function loadPolls() {
    const pollsContainer = document.getElementById('pollsContainer');
    pollsContainer.innerHTML = '';

    const pollsSnapshot = await db.collection('polls').get();
    pollsSnapshot.forEach(doc => {
        const pollData = doc.data();
        const pollCard = createPollCard(doc.id, pollData);
        pollsContainer.appendChild(pollCard);
    });
}

function createPollCard(id, data) {
    const card = document.createElement('div');
    card.classList.add('card', 'mb-4');
    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${data.question}</h5>
            ${data.options.map((option, index) => `
                <button class="btn btn-outline-primary w-100 my-1" onclick="vote('${id}', ${index})">
                    ${option} <span id="progress-${id}-${index}">0%</span>
                </button>
            `).join('')}
            <button class="btn btn-secondary w-100 mt-3" data-bs-toggle="modal" data-bs-target="#pollDetailModal" onclick="showPollDetails('${id}')">
                Poll Details
            </button>
        </div>
    `;
    return card;
}

async function vote(pollId, optionIndex) {
    const user = auth.currentUser;
    const userVoteRef = db.collection('polls').doc(pollId).collection('votes').doc(user.uid);
    const pollRef = db.collection('polls').doc(pollId);

    const previousVote = await userVoteRef.get();
    if (previousVote.exists && previousVote.data().optionIndex !== optionIndex) {
        const previousIndex = previousVote.data().optionIndex;
        await pollRef.update({
            [`options.${previousIndex}.voters`]: firebase.firestore.FieldValue.arrayRemove(user.uid)
        });
    }

    await userVoteRef.set({ optionIndex });
    await pollRef.update({
        [`options.${optionIndex}.voters`]: firebase.firestore.FieldValue.arrayUnion(user.uid)
    });

    updatePollProgress(pollId);
}

async function updatePollProgress(pollId) {
    const pollDoc = await db.collection('polls').doc(pollId).get();
    const pollData = pollDoc.data();

    const totalVotes = pollData.options.reduce((sum, option) => sum + (option.voters ? option.voters.length : 0), 0);

    pollData.options.forEach((option, index) => {
        const count = option.voters ? option.voters.length : 0;
        const percentage = totalVotes ? (count / totalVotes * 100).toFixed(0) : 0;
        document.getElementById(`progress-${pollId}-${index}`).innerText = `${percentage}%`;
    });
}

async function showPollDetails(pollId) {
    const pollDetails = document.getElementById('pollDetails');
    pollDetails.innerHTML = '';

    const votesSnapshot = await db.collection('polls').doc(pollId).collection('votes').get();
    const optionCounts = {};
    const userNames = {};

    votesSnapshot.forEach(doc => {
        const { optionIndex } = doc.data();
        optionCounts[optionIndex] = (optionCounts[optionIndex] || 0) + 1;
        userNames[optionIndex] = (userNames[optionIndex] || []).concat(doc.id);
    });

    Object.entries(optionCounts).forEach(([index, count]) => {
        const users = userNames[index].join(', ');
        pollDetails.innerHTML += `<p>Option ${index + 1}: ${count} votes - ${users}</p>`;
    });
}
