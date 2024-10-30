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
        console.log("User is authenticated:", user.uid);
        showPollsPage();
        loadPolls();
    } else {
        console.log("No authenticated user");
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
    try {
        const pollsSnapshot = await db.collection('polls').get();
        pollsSnapshot.forEach(doc => {
            const pollData = doc.data();
            const pollCard = createPollCard(doc.id, pollData);
            pollsContainer.appendChild(pollCard);
        });
    } catch (error) {
        console.error("Error loading polls:", error);
    }
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

        // Log existing poll data for debugging
        console.log("Poll data before voting:", pollDoc.data());

        // Remove user from all options first
        const updatePromises = Object.keys(pollDoc.data().options).map(async key => {
            if (pollDoc.data().options[key].includes(user.uid)) {
                return pollRef.update({
                    [`options.${key}`]: firebase.firestore.FieldValue.arrayRemove(user.uid)
                });
            }
        });
        await Promise.all(updatePromises);

        // Add user to the selected option
        await pollRef.update({
            [`options.${optionKey}`]: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });

        console.log("Vote successfully recorded for:", optionKey);
        updatePollProgress(pollId); // Update progress display after voting
    } catch (error) {
        console.error("Error voting:", error); // Captures any detailed error
    }
}

// Function to update poll progress
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
            const progressElement = document.getElementById(`progress-${pollId}-${key}`);
            if (progressElement) {
                progressElement.innerText = `${percentage}%`;
            }
        }
    } catch (error) {
        console.error("Error updating poll progress:", error);
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