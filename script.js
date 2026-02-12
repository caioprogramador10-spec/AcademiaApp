// --- CONFIGURAÇÃO SUPABASE (CONEXÃO NUVEM) ---
const _URL = "https://aeknsntfkaghrwdekpsz.supabase.co";
const _KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFla25zbnRma2FnaHJ3ZGVrcHN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTcwNjEsImV4cCI6MjA4NjQzMzA2MX0.jgrfGQdbB7sbIZSOWeLN48qauhWjk6CyAdv8ke3h5EU";
const _supabase = supabase.createClient(_URL, _KEY);

let filtroStatusAtual = 'todos';

// --- SISTEMA DE LOGIN ---
async function verificarLogin() {
    const email = document.getElementById('emailInput').value;
    const senha = document.getElementById('senhaInput').value;
    const erro = document.getElementById('erroLogin');

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
        erro.innerText = "Acesso negado: Verifique e-mail e senha.";
        erro.style.display = 'block';
    } else {
        document.getElementById('telaLogin').style.display = 'none';
        renderizar();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se já está logado
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        document.getElementById('telaLogin').style.display = 'none';
    }

    verificarViradaDeMes();
    renderizar();
});

// --- LÓGICA DE GESTÃO MENSAL (SINCRONIZADA) ---
async function verificarViradaDeMes() {
    const dataAtual = new Date();
    const mesAnoAtual = `${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}/${dataAtual.getFullYear()}`;
    const ultimoMesGravado = localStorage.getItem('ultimoMesAcesso');

    if (!ultimoMesGravado) {
        localStorage.setItem('ultimoMesAcesso', mesAnoAtual);
        return;
    }

    if (ultimoMesGravado !== mesAnoAtual) {
        // Puxa alunos da nuvem para fechar o mês
        let { data: alunos } = await _supabase.from('alunos').select('*');
        if (!alunos) return;

        let totalRecebido = alunos.filter(a => a.pagoNoMes).reduce((sum, a) => sum + (a.valor || 0), 0);
        
        // Salva no histórico da nuvem
        await _supabase.from('historico').insert({ mes: ultimoMesGravado, valor: totalRecebido });

        // Reseta o status de todos na nuvem para o novo mês
        await _supabase.from('alunos').update({ pagoNoMes: false }).neq('id', 0);

        localStorage.setItem('ultimoMesAcesso', mesAnoAtual);
        alert(`Mês de ${ultimoMesGravado} fechado. Relatório salvo na nuvem!`);
        renderizar();
    }
}

// --- CONTROLE DE MODAIS ---
async function abrirModal(id = null) {
    const modal = document.getElementById('modal');
    modal.style.display = 'flex';
    
    if (id) {
        // Busca o aluno específico na nuvem para editar
        const { data: a } = await _supabase.from('alunos').select('*').eq('id', id).single();
        
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

async function abrirRelatorioHistorico() {
    const modal = document.getElementById('modalRelatorio');
    const container = document.getElementById('listaHistorico');
    modal.style.display = 'flex';

    // Puxa histórico da nuvem
    let { data: historico } = await _supabase.from('historico').select('*').order('created_at', { ascending: false });

    container.innerHTML = !historico || historico.length === 0 
        ? "<p style='text-align:center; color:#888;'>Nenhum histórico disponível.</p>"
        : historico.map(item => `
            <div class="item-historico">
                <small>${item.mes}</small>
                <b>R$ ${item.valor.toLocaleString()}</b>
            </div>
        `).join('');
}

function fecharRelatorio() { document.getElementById('modalRelatorio').style.display = 'none'; }

// --- OPERAÇÕES NA NUVEM ---
async function salvarAluno() {
    const id = document.getElementById('alunoId').value;
    
    // Se for edição, precisamos saber se ele já tinha pago no mês
    let pagoStatus = false;
    if (id) {
        const { data: existente } = await _supabase.from('alunos').select('pagoNoMes').eq('id', id).single();
        pagoStatus = existente ? existente.pagoNoMes : false;
    }

    const aluno = {
        id: id ? parseInt(id) : Date.now(),
        nome: document.getElementById('nome').value,
        whatsapp: document.getElementById('whatsapp').value,
        nascimento: document.getElementById('nascimento').value,
        vencimento: document.getElementById('dataVenc').value,
        planoMeses: parseInt(document.getElementById('plano').value),
        pagamento: document.getElementById('pagamento').value,
        valor: parseFloat(document.getElementById('valor').value || 0),
        pagoNoMes: pagoStatus
    };

    if (!aluno.nome || !aluno.vencimento) return alert("Preencha Nome e Vencimento!");

    // Upsert salva se não existe, ou atualiza se já existe
    const { error } = await _supabase.from('alunos').upsert(aluno);

    if (error) {
        alert("Erro ao salvar na nuvem!");
    } else {
        fecharModal();
        renderizar();
    }
}

async function renderizar() {
    const container = document.getElementById('listaAlunos');
    const busca = document.getElementById('inputBusca').value.toLowerCase();
    
    // Puxa todos os alunos da nuvem (Sincronizado para os sócios)
    let { data: alunos } = await _supabase.from('alunos').select('*').order('nome', { ascending: true });
    if (!alunos) alunos = [];
    
    const hoje = new Date();
    const hojeString = hoje.toISOString().split('T')[0];
    const amanhaString = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const diaMesHoje = `${hoje.getDate()}/${hoje.getMonth() + 1}`;

    let faturamentoRecebido = 0;
    let temAniversariante = false;
    container.innerHTML = "";

    alunos.forEach(a => {
        if (a.pagoNoMes) faturamentoRecebido += (a.valor || 0);
        
        let stClass = "em-dia";
        if (a.vencimento < hojeString) stClass = "atrasado";
        else if (a.vencimento === amanhaString) stClass = "a-vencer";

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

async function darBaixa(id) {
    const { data: a } = await _supabase.from('alunos').select('*').eq('id', id).single();
    if (a) {
        let d = new Date(a.vencimento);
        d.setMonth(d.getMonth() + a.planoMeses);
        const novoVencimento = d.toISOString().split('T')[0];

        await _supabase.from('alunos').update({ 
            pagoNoMes: true, 
            vencimento: novoVencimento 
        }).eq('id', id);
        
        renderizar();
    }
}

// Funções de comunicação e interface (Mantidas originais)
function whatsappIndividual(tel, nome) {
    const msg = window.encodeURIComponent(`Olá ${nome}! Passando para lembrar que sua mensalidade vence em breve. 💪`);
    window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${msg}`);
}

function parabenizar(tel, nome) {
    const msg = window.encodeURIComponent(`Parabéns, ${nome}! 🥳 Toda a equipe da CaioSystem te deseja um dia incrível e muitos treinos! Bora comemorar? 💪🔥`);
    window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${msg}`);
}

async function enviarCobrancaGeral() {
    const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    let { data: alunos } = await _supabase.from('alunos').select('*');
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

async function excluir(id) {
    if (confirm("Remover aluno permanentemente?")) {
        await _supabase.from('alunos').delete().eq('id', id);
        renderizar();
    }
}

// Funções de Backup mantidas para segurança extra do cliente
function exportarBackup() { /* ... código original mantido ... */ }
function importarBackup() { /* ... código original mantido ... */ }
