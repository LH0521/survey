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

auth.onAuthStateChanged(user => {
    if (user) {
        showPollsPage();
        loadPolls(user.uid); // Pass user ID to load selected option
    } else {
        showLandingPage();
        clearPolls();
    }
});

function showLandingPage() {
    document.getElementById('landingPage').style.display = 'block';
    document.getElementById('pollsPage').style.display = 'none';
}

function showPollsPage() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('pollsPage').style.display = 'block';
}

async function loadPolls(userId) {
    clearPolls();
    const pollsContainer = document.getElementById('pollsContainer');

    try {
        const pollsSnapshot = await db.collection('polls').get();
        pollsSnapshot.forEach(doc => {
            const pollData = doc.data();
            const pollCard = createPollCard(doc.id, pollData, userId); // Pass user ID to check selection
            pollsContainer.appendChild(pollCard);
            updatePollProgress(doc.id); // Load stats immediately
        });
    } catch (error) {
        console.error("Error loading polls:", error);
    }
}

function clearPolls() {
    document.getElementById('pollsContainer').innerHTML = '';
}

function createPollCard(id, data, userId) {
    const card = document.createElement('div');
    card.classList.add('d-flex', 'flex-column', 'gap-2', 'mb-4');

    const optionsHtml = Object.keys(data.options).map(optionKey => {
        const isChecked = data.options[optionKey].includes(userId) ? 'checked' : '';
        return `
            <div class="d-flex align-items-center border rounded p-3">
                <div class="me-3">
                    <div class="icon icon-shape rounded-2 text-lg bg-indigo-500 text-white">
                        <i class="ph ph-article"></i>
                    </div>
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-1">
                            <input type="radio" name="poll-${id}" onclick="vote('${id}', '${optionKey}')" class="me-3" ${isChecked}>
                            ${optionKey}
                        </h6>
                        <small id="progress-text-${id}-${optionKey}" class="text-muted">0% (0 Votes)</small>
                    </div>
                    <div class="progress mt-1" style="height: 5px;">
                        <div id="progress-bar-${id}-${optionKey}" class="progress-bar bg-blue-500" role="progressbar" style="width: 0%;"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${data.question}</h5>
            ${optionsHtml}
        </div>
    `;
    return card;
}

async function updatePollProgress(pollId) {
    try {
        const pollDoc = await db.collection('polls').doc(pollId).get();
        if (!pollDoc.exists) {
            console.error("Poll not found");
            return;
        }
        const pollData = pollDoc.data();
        const totalVotes = Object.values(pollData.options).reduce((sum, voters) => sum + voters.length, 0);

        for (const [key, voters] of Object.entries(pollData.options)) {
            const percentage = totalVotes ? (voters.length / totalVotes * 100).toFixed(0) : 0;
            const progressBar = document.getElementById(`progress-bar-${pollId}-${key}`);
            const progressText = document.getElementById(`progress-text-${pollId}-${key}`);
            if (progressBar && progressText) {
                progressBar.style.width = `${percentage}%`;
                progressText.innerText = `${percentage}% (${voters.length} votes)`;
            }
        }
    } catch (error) {
        console.error("Error updating poll progress:", error);
    }
}

async function vote(pollId, optionKey) {
    const user = auth.currentUser;
    if (!user) {
        console.error("User not authenticated");
        return;
    }

    const pollRef = db.collection('polls').doc(pollId);

    try {
        const pollDoc = await pollRef.get();
        if (!pollDoc.exists) {
            console.error("Poll not found");
            return;
        }
        const pollData = pollDoc.data();

        const updatePromises = Object.keys(pollData.options).map(async key => {
            if (pollData.options[key].includes(user.uid)) {
                return pollRef.update({
                    [`options.${key}`]: firebase.firestore.FieldValue.arrayRemove(user.uid)
                });
            }
        });
        await Promise.all(updatePromises);

        await pollRef.update({
            [`options.${optionKey}`]: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });

        updatePollProgress(pollId); // Update progress display after voting
    } catch (error) {
        console.error("Error voting:", error);
    }
}

document.getElementById('loginBtn').onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => console.error("Login failed:", error));
};

document.getElementById('logoutBtn').onclick = () => {
    auth.signOut().catch(error => console.error("Logout failed:", error));
};
