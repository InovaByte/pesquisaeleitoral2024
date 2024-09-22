import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, setDoc, doc, getDoc, collection, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Configurações do Firebase
const firebaseConfig = {
    apiKey: "",
    authDomain: "pesquisaeleitoral2024-6032f.firebaseapp.com",
    projectId: "pesquisaeleitoral2024-6032f",
    storageBucket: "pesquisaeleitoral2024-6032f.appspot.com",
    messagingSenderId: "1062995529688",
    appId: "1:1062995529688:web:a40896249ab692bcd06cad",
    measurementId: "G-5WETF0DHT9"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const candidates = [
    { name: "Sukita Laranja", avatar: "https://raichu-uploads.s3.amazonaws.com/logo_sukita_3yQLi2.png"},
    { name: "Trator Verde", avatar: "https://th.bing.com/th/id/OIP.aOdTJPMXaLMQs9y113mL2QAAAA?rs=1&pid=ImgDetMain" },
    { name: "Outros", avatar: "https://th.bing.com/th/id/OIP.S5TH1lIEQzbHLHXjzk5AbAHaHa?w=800&h=800&rs=1&pid=ImgDetMain" }
];

const candidatesContainer = document.getElementById('candidates');
const results = document.getElementById('results');
const message = document.getElementById('message');
const anonymousCheck = document.getElementById('anonymousCheck');
const nameInput = document.getElementById('nameInput');
const commentsContainer = document.getElementById('commentsContainer');

let hasVoted = false;

// Obtem o ID da máquina do localStorage ou cria um novo
const machineId = localStorage.getItem('machineId') || Math.random().toString(36).substring(2, 15);
localStorage.setItem('machineId', machineId);

// Cria elementos para os candidatos
candidates.forEach(candidate => {
    const candidateElement = document.createElement('div');
    candidateElement.className = 'candidate';

    candidateElement.innerHTML = `
        <img src="${candidate.avatar}" class="avatar" alt="${candidate.name}">
        <span class="name">${candidate.name}</span>
        <button class="vote-btn" onclick="vote('${candidate.name}')">Votar</button>
    `;

    candidatesContainer.appendChild(candidateElement);
});

// Função de votação
window.vote = async function(candidateName) {
    if (hasVoted) {
        message.textContent = "Você já votou nesta pesquisa.";
        return;
    }

    // Verifica se já votou localmente
    if (localStorage.getItem('voted_' + machineId)) {
        message.textContent = "Esta máquina já registrou um voto.";
        disableVoteButtons();
        return;
    }

    // Armazena os votos no Firestore
    try {
        const candidateRef = doc(db, "votes", candidateName);
        const candidateSnap = await getDoc(candidateRef);

        let currentVotes = 0;
        if (candidateSnap.exists()) {
            currentVotes = candidateSnap.data().count || 0;
        }

        // Incrementa os votos e atualiza o documento do candidato
        await setDoc(candidateRef, { count: currentVotes + 1 });

        message.textContent = "Seu voto foi registrado com sucesso!";
        hasVoted = true;
        localStorage.setItem('voted_' + machineId, 'true');
        disableVoteButtons();
    } catch (error) {
        console.error("Erro ao registrar voto: ", error);
        message.textContent = "Erro ao registrar seu voto. Tente novamente.";
    }
};

// Desabilita os botões de voto
function disableVoteButtons() {
    const buttons = document.querySelectorAll('.vote-btn');
    buttons.forEach(button => {
        button.disabled = true;
    });
}

// Função para atualizar os resultados
function updateResults(votesData) {
    const totalVotes = Object.values(votesData).reduce((a, b) => a + b, 0);
    let resultsHtml = '<h2>Resultados Parciais:</h2>';
    
    for (let candidate in votesData) {
        const percentage = totalVotes > 0 ? ((votesData[candidate] / totalVotes) * 100).toFixed(1) : 0;
        const barColor = candidate === "Sukita Laranja" ? "#FFA500" : 
                         candidate === "Trator Verde" ? "#228B22" : "#A9A9A9";
        
        resultsHtml += `
            <div>
                <p>${candidate}: ${percentage}% (${votesData[candidate]} votos)</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${percentage}%; background-color: ${barColor};"></div>
                </div>
            </div>
        `;
    }
    
    results.innerHTML = resultsHtml;
}

// Escuta atualizações em tempo real para cada candidato
onSnapshot(collection(db, "votes"), (snapshot) => {
    let votesData = {};
    snapshot.forEach((doc) => {
        votesData[doc.id] = doc.data().count;
    });
    updateResults(votesData);
});

// Verifica se já votou ao carregar a página
if (localStorage.getItem('voted_' + machineId)) {
    hasVoted = true;
    message.textContent = "Esta máquina já registrou um voto.";
    disableVoteButtons();
}

// Função para lidar com a checkbox de anonimato
anonymousCheck.addEventListener('change', function() {
    nameInput.style.display = this.checked ? 'none' : 'block';
});

// Função para enviar comentários
async function submitComment() {
    const commentText = document.getElementById('commentInput').value;
    const authorName = anonymousCheck.checked ? "Anônimo" : nameInput.value || "Visitante";

    if (commentText.trim() === "") {
        alert("Por favor, insira um comentário!");
        return;
    }

    try {
        const timestamp = Date.now(); // Obtem o timestamp atual
        const commentRef = doc(db, 'comments', timestamp.toString());
        await setDoc(commentRef, { text: commentText, author: authorName, timestamp: timestamp });
        document.getElementById('commentInput').value = '';
        nameInput.value = '';
        renderComments(); // Chama a função de renderização de comentários após adicionar um novo
        message.className = "success-message";
        message.innerText = "Comentário enviado com sucesso!";
    } catch (error) {
        console.error("Erro ao enviar o comentário: ", error);
        message.className = "error-message";
        message.innerText = "Erro ao enviar o comentário. Tente novamente.";
    }
}

// Função para renderizar comentários
async function renderComments() {
    commentsContainer.innerHTML = ''; // Limpa comentários existentes
    const querySnapshot = await getDocs(collection(db, 'comments'));

    // Cria um array para armazenar os comentários
    const commentsArray = [];
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        commentsArray.push({
            id: doc.id,
            author: data.author,
            text: data.text,
            timestamp: data.timestamp // Certifique-se de que você está armazenando um timestamp
        });
    });

    // Ordena os comentários por timestamp (mais recente primeiro)
    commentsArray.sort((a, b) => b.timestamp - a.timestamp);

    // Renderiza os comentários, adicionando os mais recentes no topo
    commentsArray.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment');
        commentDiv.innerHTML = `
            <div class="comment-author">${comment.author}</div>
            <div>${comment.text}</div>
            <div class="comment-time">${new Date(comment.timestamp).toLocaleString()}</div>
        `;
        commentsContainer.appendChild(commentDiv); // Adiciona os comentários no contêiner
    });
}

// Chama a função de renderização de comentários ao carregar a página
window.onload = function() {
    renderComments();
    document.getElementById('submitCommentBtn').addEventListener('click', submitComment);
};
