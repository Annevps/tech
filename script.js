// script.js - Controla as 3 tabelas (formleads, chamados, usuarios)

document.addEventListener('DOMContentLoaded', () => {
    // Atualiza o indicador visual de conexão no menu
    atualizarStatusMenu();

    // Carrega dados automaticamente caso a tabela exista na tela atual
    if (document.getElementById('lista-chamados')) carregarChamados();
    if (document.getElementById('grid-usuarios')) carregarUsuarios();

    // Conecta os formulários às funções
    const formContato = document.getElementById('form-contato');
    if (formContato) formContato.addEventListener('submit', enviarFormularioContato);

    const formChamado = document.getElementById('form-chamado');
    if (formChamado) formChamado.addEventListener('submit', criarNovoChamado);
});

// Atualiza a bolinha indicadora no menu (Verde = Conectado / Vermelho = Erro)
async function atualizarStatusMenu() {
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');

    if (!statusText || !statusDot) return;

    const estaConectado = await checkDatabaseConnection();
    if (estaConectado) {
        statusText.innerText = "DB Conectado";
        statusDot.className = "status-dot green";
    } else {
        statusText.innerText = "Erro no DB";
        statusDot.className = "status-dot red";
    }
}

// 1. Tabela formleads (Formulário de Contato)
async function enviarFormularioContato(event) {
    event.preventDefault();
    const nome = document.getElementById('contato-nome').value;
    const email = document.getElementById('contato-email').value;
    const mensagem = document.getElementById('contato-mensagem').value;

    const { data, error } = await window.db
        .from('formleads')
        .insert([{ nome, email, mensagem }]);

    if (error) {
        alert('Erro ao enviar mensagem: ' + error.message);
    } else {
        alert('Mensagem enviada com sucesso!');
        event.target.reset();
    }
}

// 2. Tabela chamados (Suporte / Tickets)
async function criarNovoChamado(event) {
    event.preventDefault();
    const titulo = document.getElementById('chamado-titulo').value;
    const descricao = document.getElementById('chamado-descricao').value;

    const { data, error } = await window.db
        .from('chamados')
        .insert([{ titulo, descricao, status: 'Aberto' }]);

    if (error) {
        alert('Erro ao criar chamado: ' + error.message);
    } else {
        alert('Chamado criado com sucesso!');
        event.target.reset();
        if (document.getElementById('lista-chamados')) carregarChamados();
    }
}

async function carregarChamados() {
    const tabela = document.getElementById('lista-chamados');
    if (!tabela) return;

    const { data: chamados, error } = await window.db.from('chamados').select('*');

    if (error || !chamados) {
        tabela.innerHTML = '<tr><td colspan="3">Erro ao carregar dados.</td></tr>';
        return;
    }

    tabela.innerHTML = chamados.map(c => `
        <tr>
            <td>#${c.id}</td>
            <td>${c.titulo}</td>
            <td>${c.status || 'Aberto'}</td>
        </tr>
    `).join('');
}

// 3. Tabela usuarios (Listagem do Time/Usuários)
async function carregarUsuarios() {
    const grid = document.getElementById('grid-usuarios');
    if (!grid) return;

    const { data: usuarios, error } = await window.db.from('usuarios').select('*');

    if (error || !usuarios) {
        grid.innerHTML = '<p>Erro ao carregar usuários.</p>';
        return;
    }

    grid.innerHTML = usuarios.map(u => `
        <div style="border:1px solid #ccc; padding:10px; margin:5px;">
            <strong>${u.nome || 'Usuário'}</strong>
            <p>${u.email}</p>
        </div>
    `).join('');
}
