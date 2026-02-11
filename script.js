let filtroStatusAtual = 'todos';

document.addEventListener('DOMContentLoaded', () => {
    verificarViradaDeMes();
    renderizar();
});

// --- LÓGICA DE GESTÃO MENSAL ---
function verificarViradaDeMes() {
    const dataAtual = new Date();
    const mesAnoAtual = `${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}/${dataAtual.getFullYear()}`;
    const ultimoMesGravado = localStorage.getItem('ultimoMesAcesso');

    if (!ultimoMesGravado) {
        localStorage.setItem('ultimoMesAcesso', mesAnoAtual);
        return;
    }

    if (ultimoMesGravado !== mesAnoAtual) {
        let alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
        let totalRecebido = alunos.filter(a => a.pagoNoMes).reduce((sum, a) => sum + (a.valor || 0), 0);
        
        let historico = JSON.parse(localStorage.getItem('historicoFaturamento') || '[]');
        historico.push({ mes: ultimoMesGravado, valor: totalRecebido });
        localStorage.setItem('historicoFaturamento', JSON.stringify(historico));

        alunos.forEach(a => a.pagoNoMes = false);
        localStorage.setItem('alunos', JSON.stringify(alunos));
        
        localStorage.setItem('ultimoMesAcesso', mesAnoAtual);
        alert(`Mês de ${ultimoMesGravado} fechado. Relatório salvo no histórico!`);
    }
}

// --- CONTROLE DE MODAIS ---
function abrirModal(id = null) {
    const modal = document.getElementById('modal');
    modal.style.display = 'flex';
    
    if (id) {
        const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
        const a = alunos.find(x => x.id == id);
        document.getElementById('modalTitulo').innerText = "Editar Aluno";
        document.getElementById('alunoId').value = a.id;
        document.getElementById('nome').value = a.nome;
        document.getElementById('whatsapp').value = a.whatsapp;
        document.getElementById('nascimento').value = a.nascimento || "";
        document.getElementById('dataVenc').value = a.vencimento;
        document.getElementById('plano').value = a.planoMeses;
        document.getElementById('pagamento').value = a.pagamento;
        document.getElementById('valor').value = a.valor;
    } else {
        document.getElementById('modalTitulo').innerText = "Novo Aluno";
        document.getElementById('alunoId').value = "";
        document.querySelectorAll('#modal input').forEach(i => i.value = "");
    }
}

function fecharModal() { document.getElementById('modal').style.display = 'none'; }

function abrirRelatorioHistorico() {
    const modal = document.getElementById('modalRelatorio');
    const container = document.getElementById('listaHistorico');
    const historico = JSON.parse(localStorage.getItem('historicoFaturamento') || '[]');

    modal.style.display = 'flex';
    container.innerHTML = historico.length === 0 
        ? "<p style='text-align:center; color:#888;'>Nenhum histórico disponível.</p>"
        : historico.reverse().map(item => `
            <div class="item-historico">
                <small>${item.mes}</small>
                <b>R$ ${item.valor.toLocaleString()}</b>
            </div>
        `).join('');
}

function fecharRelatorio() { document.getElementById('modalRelatorio').style.display = 'none'; }

// --- OPERAÇÕES ---
function salvarAluno() {
    const id = document.getElementById('alunoId').value;
    const antigoAluno = id ? JSON.parse(localStorage.getItem('alunos')).find(x => x.id == id) : null;

    const aluno = {
        id: id ? parseInt(id) : Date.now(),
        nome: document.getElementById('nome').value,
        whatsapp: document.getElementById('whatsapp').value,
        nascimento: document.getElementById('nascimento').value,
        vencimento: document.getElementById('dataVenc').value,
        planoMeses: parseInt(document.getElementById('plano').value),
        pagamento: document.getElementById('pagamento').value,
        valor: parseFloat(document.getElementById('valor').value || 0),
        pagoNoMes: antigoAluno ? (antigoAluno.pagoNoMes || false) : false
    };

    if (!aluno.nome || !aluno.vencimento) return alert("Preencha Nome e Vencimento!");

    let alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    const index = alunos.findIndex(a => a.id == aluno.id);
    
    if (index > -1) alunos[index] = aluno;
    else alunos.push(aluno);

    localStorage.setItem('alunos', JSON.stringify(alunos));
    fecharModal();
    renderizar();
}

function renderizar() {
    const container = document.getElementById('listaAlunos');
    const busca = document.getElementById('inputBusca').value.toLowerCase();
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    
    const hoje = new Date();
    const hojeString = hoje.toISOString().split('T')[0];
    const amanhaString = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const diaMesHoje = `${hoje.getDate()}/${hoje.getMonth() + 1}`;

    let faturamentoRecebido = 0;
    let temAniversariante = false;
    container.innerHTML = "";

    alunos.forEach(a => {
        if (a.pagoNoMes) faturamentoRecebido += a.valor;
        
        // Lógica de Status
        let stClass = "em-dia";
        if (a.vencimento < hojeString) stClass = "atrasado";
        else if (a.vencimento === amanhaString) stClass = "a-vencer";

        // Lógica de Aniversário
        let isAniversariante = false;
        if (a.nascimento) {
            const dNas = new Date(a.nascimento);
            const diaMesNas = `${dNas.getUTCDate()}/${dNas.getUTCMonth() + 1}`;
            if (diaMesNas === diaMesHoje) {
                isAniversariante = true;
                temAniversariante = true;
            }
        }

        if (filtroStatusAtual !== 'todos' && stClass !== filtroStatusAtual) return;
        if (!a.nome.toLowerCase().includes(busca)) return;

        container.innerHTML += `
            <div class="card-aluno ${stClass} ${a.pagoNoMes ? 'pago' : ''}">
                <div class="card-info" onclick="abrirModal(${a.id})">
                    <h3>${isAniversariante ? '🎂 ' : ''}${a.nome.toUpperCase()}</h3>
                    <p><span class="material-icons">event</span> Vence: ${a.vencimento.split('-').reverse().join('/')}</p>
                    <p><span class="material-icons">sell</span> ${a.planoMeses}m | ${a.pagamento} | R$ ${a.valor}</p>
                    ${a.pagoNoMes ? '<small style="color:#25D366; font-weight:bold;">PAGO NO MÊS</small>' : ''}
                </div>
                <div class="actions-buttons">
                    ${isAniversariante ? `
                        <button class="btn-circle" onclick="parabenizar('${a.whatsapp}', '${a.nome}')" style="background:#ff4081">
                            <span class="material-icons">cake</span>
                        </button>
                    ` : ''}
                    <button class="btn-circle" onclick="whatsappIndividual('${a.whatsapp}', '${a.nome}')">
                        <span class="material-icons" style="color:#25D366">chat</span>
                    </button>
                    ${!a.pagoNoMes ? `
                        <button class="btn-circle" onclick="darBaixa(${a.id})">
                            <span class="material-icons" style="color:#00d2ff">check_circle</span>
                        </button>
                    ` : ''}
                    <button class="btn-circle" onclick="excluir(${a.id})">
                        <span class="material-icons" style="color:#ff4757">delete</span>
                    </button>
                </div>
            </div>`;
    });

    document.getElementById('countAlunos').innerText = alunos.length;
    document.getElementById('faturamentoMensal').innerText = `R$ ${faturamentoRecebido.toLocaleString()}`;
    document.getElementById('alertaAniversario').style.display = temAniversariante ? 'block' : 'none';
}

function darBaixa(id) {
    let alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    const idx = alunos.findIndex(a => a.id == id);
    if (idx > -1) {
        alunos[idx].pagoNoMes = true;
        let d = new Date(alunos[idx].vencimento);
        d.setMonth(d.getMonth() + alunos[idx].planoMeses);
        alunos[idx].vencimento = d.toISOString().split('T')[0];
        localStorage.setItem('alunos', JSON.stringify(alunos));
        renderizar();
    }
}

function whatsappIndividual(tel, nome) {
    const msg = window.encodeURIComponent(`Olá ${nome}! Passando para lembrar que sua mensalidade vence em breve. Aguardamos você! 💪`);
    window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${msg}`);
}

function parabenizar(tel, nome) {
    const msg = window.encodeURIComponent(`Parabéns, ${nome}! 🥳 Toda a equipe da CaioSystem te deseja um dia incrível e muitos treinos! Bora comemorar? 💪🔥`);
    window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${msg}`);
}

function enviarCobrancaGeral() {
    const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    const alvos = alunos.filter(a => a.vencimento === amanha && !a.pagoNoMes);
    if (alvos.length === 0) return alert("Ninguém para cobrar amanhã!");
    alvos.forEach((a, i) => { setTimeout(() => { whatsappIndividual(a.whatsapp, a.nome); }, i * 1500); });
}

function filtrarStatus(status) {
    filtroStatusAtual = status;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    renderizar();
}

function excluir(id) {
    if (confirm("Remover aluno permanentemente?")) {
        let alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
        localStorage.setItem('alunos', JSON.stringify(alunos.filter(a => a.id != id)));
        renderizar();
    }
}

// --- BACKUP ---
function exportarBackup() {
    const dados = {
        alunos: JSON.parse(localStorage.getItem('alunos') || '[]'),
        historico: JSON.parse(localStorage.getItem('historicoFaturamento') || '[]'),
        ultimoMes: localStorage.getItem('ultimoMesAcesso')
    };
    const blob = new Blob([JSON.stringify(dados)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_caio_system_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    a.click();
}

function importarBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = event => {
            const conteudo = JSON.parse(event.target.result);
            if (confirm("Restaurar backup? Isso substituirá os dados atuais.")) {
                localStorage.setItem('alunos', JSON.stringify(conteudo.alunos));
                localStorage.setItem('historicoFaturamento', JSON.stringify(conteudo.historico));
                localStorage.setItem('ultimoMesAcesso', conteudo.ultimoMes);
                window.location.reload();
            }
        };
    };
    input.click();
}