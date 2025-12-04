const mes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const diaSemana = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado']

function erroAviso(variavelErro){ //mostra mensagem de erro na tela
    const divPrincipal = document.querySelector(".info-principal")
    const mensagemAntiga = document.querySelector('.mensagem-erro')
    if(mensagemAntiga) mensagemAntiga.remove()
    const mensagemErro = document.createElement('p')
    mensagemErro.innerText = variavelErro.message || variavelErro // aceita  variavel ou string
    mensagemErro.classList.add('mensagem-erro')
    divPrincipal.appendChild(mensagemErro) 
}

function verificacaoIconClima(chave, variavel) { // atribui o icone conforme o clima
    switch (chave) {
        case 'Clouds':
            variavel.src = './assets/icons/nublado.svg'
            break;
        case 'Rain':
            variavel.src = './assets/icons/chuva.svg'
            break;
        case 'Clear':
            variavel.src = './assets/icons/sol.svg'
            break;
        case 'Snow':
            variavel.src = './assets/icons/snow.svg'
            variavel.style.width = 'clamp(30px, 9.5vw, 55px)'
            variavel.style.margin = '3px' 
            break;
        default:
            break;
    }
}

function latitudeELongitude(){
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
    })
}

async function localizacao(){
    let longitude, latitude

    try{
        const info = await latitudeELongitude()
        latitude = info.coords.latitude
        longitude = info.coords.longitude

    } catch (erro) {
        if(erro.code === 1) { // caso usuario não permita o acesso
            erroAviso('localização não permitida')
        } else {
            erroAviso(erro)
        }
        return
    }
    
    try{
        const busca = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
        
        resposta = await busca.json()
        return resposta.address.city || resposta.address.town || resposta.address.village

    } catch (erro) {
        erroAviso(erro)
        return
    }
}

// -------------------------------------------------------------------------------------------------

let input = document.querySelector('input')
let idBuscaClima = 0 //controla qual requisição é a mais recente
// Isso evita que respostas antigas sobrescrevam a tela se o usuário fizer várias buscas rapidamente.

async function buscarDadosClima(nomeCidade) { 
   let respostaHoje, respostaPrevisao
   const meuId = ++idBuscaClima

   try{
        const chave = 'a0973eee6736cb110e65b0cefff543e8'
        cidade = nomeCidade 

        const buscaClimaHoje = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${chave}&units=metric`)

        const buscaPrevisao = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&appid=${chave}&units=metric`)
        
        if(meuId !== idBuscaClima) return // ignorar respostas antigas
       
        if(!buscaClimaHoje.ok  || !buscaPrevisao.ok) { 
            const erroStatus = !buscaClimaHoje.ok 
                ? buscaClimaHoje.status // retorna weather.status
                : buscaPrevisao.status; // retorna forecast.status

            if (erroStatus === 400) {
                throw new Error('Cidade inválida! Verifique-se de ter digitado corretamente.')
            } else if (erroStatus === 404) {
                throw new Error('Cidade não encontrada.')
            } else if (erroStatus === 500) {
                throw new Error('Erro no servidor, tente novamente mais tarde.');      
            } else {
                throw new Error(`Erro inesperado ${erroStatus}.`);   
            }
        }

        respostaHoje = await buscaClimaHoje.json() 
        respostaPrevisao = await buscaPrevisao.json()
    
    } catch(erro) {
        if(meuId !== idBuscaClima) return // ignorar erros de buscas antigas
        erroAviso(erro)
        return
    }

    if(meuId !== idBuscaClima) return 
    
    const semana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
    const previsao = {}
    previsao.hoje = {
        nome: nomeCidade,
        temperatura: respostaHoje.main.temp,
        min: null,
        max: null,
        clima: respostaHoje.weather[0].main,
        vento: respostaHoje.wind.speed,
        porcentagem_Chuva: null,
        umidade: respostaHoje.main.humidity,
        sensacao: respostaHoje.main.feels_like,
        timezone: respostaHoje.timezone
    }

    respostaPrevisao.list.forEach(item => {
        const dataItem = item.dt_txt.split(' ')[0] // pegando apenas data
        const [ano, mes, dia] = dataItem.split('-') 
        const diaSemana = new Date(ano, mes-1, dia) 
        const previsaoDia = semana[diaSemana.getDay()] //transformando data em dia da semana
        
        if(!previsao[previsaoDia]) { //
            previsao[previsaoDia] = {
                min: Infinity,
                max: -Infinity,
                clima: null,
                chuva: -Infinity,
            }
        }

        const tempMin = item.main.temp_min
        const tempMax = item.main.temp_max

        if(tempMin < previsao[previsaoDia].min) { // comparando minima
            previsao[previsaoDia].min = tempMin
        }
        if(tempMax > previsao[previsaoDia].max){ // comparando maxima
            previsao[previsaoDia].max = tempMax
        }
        
        if(!previsao[previsaoDia].clima) { 
            previsao[previsaoDia].clima = item.weather[0].main 
        }

        if(['Rain', 'Drizzle'].includes(item.weather[0].main)) { // sobrescrevendo caso em algum momento chova
             previsao[previsaoDia].clima = 'Rain'
        }

        const chanceschuva = Math.round(item.pop *100) // convertendo para porcentagem
        if(chanceschuva > previsao[previsaoDia].chuva) { // atualizando a maior chance ded chuva do dia
            previsao[previsaoDia].chuva = chanceschuva
        }
    });

    const hoje = new Date().getDay() // pegando o dial atual
    previsao.hoje.porcentagem_Chuva = previsao[semana[hoje]].chuva // atribuindo maior chance de chuva do dia atual, pois a weather API não fornece essa info no endpoint atual
    previsao.hoje.max = previsao[semana[hoje]].max   
    previsao.hoje.min = previsao[semana[hoje]].min
    delete previsao[semana[hoje]] // deletando dia atual da previsa futura para não repetir e mostrar apenas os proximos dias, ja que as infos do dia atual ja estao em previsao.hoje

    return previsao // retornando os dados processados do clima em um objeto para facilitar o uso na interface
}

//--------------------------------------------------------------------------------------

let timezoneUsuario = null //armazena o timezone do usuario para atualizar na funcao data e hora
async function dadosClima(dados) { // recebe o objeto retornado pela funcao buscarDadosClima
    
    const info = await dados // armazena o objeto retornado pela funcao buscarDadosClima 
    const tempAtual = document.querySelector('#grauPrincipal')
    const minimaEMaxima = document.querySelector('#minMAx')
    const vento = document.querySelector('#vento')
    const chuva = document.querySelector('#chuva')
    const umidade = document.querySelector('#umidade')
    const iconFeelsLike = document.querySelector('#icon-clima')
    const valorTermico = document.querySelector('#valor-Termico')
    const local = document.querySelector('#local')
    const sectionPrevisao = document.querySelector('#sectionPrevisao')
    
    function limparDuplicata(){  // limpa os dados antigos para evitar duplicatas
        tempAtual.innerHTML = ''
        local.innerHTML = ''
        sectionPrevisao.innerHTML = ''
    }
    
    limparDuplicata()

    tempAtual.innerHTML += `${info.hoje.temperatura.toFixed(0)}<span>°C</span>`
    minimaEMaxima.innerText = `${info.hoje.max.toFixed(0)}°  ${info.hoje.min.toFixed(0)}°`
    vento.innerText = `${info.hoje.vento.toFixed(0)}Km/h`
    chuva.innerText = `${info.hoje.porcentagem_Chuva}%`
    umidade.innerText = `${info.hoje.umidade}%`
    valorTermico.innerText = `${info.hoje.sensacao.toFixed(0)}°`

    function captalize(frase) { 
        let  fraseArray = frase.split(' ')
        let arrayFormatado = []
        for(let l of fraseArray) {
            arrayFormatado.push((l[0].toUpperCase() + l.slice(1)))
        }

        return arrayFormatado.join(' ')   
    }

    const iconLocal = document.createElement('img')
    iconLocal.src = './assets/icons/local.svg'
    local.append(iconLocal, captalize(cidade))
    
    verificacaoIconClima(info.hoje.clima, iconFeelsLike) 

    for(let chave of Object.keys(info)){ // percorrendo previsao para adiconar as mnimas e maximas dos proximos dias
        let divCard = document.createElement('div')
        let previsaoIcon = document.createElement('img')
        let pDia = document.createElement('p')
        let pMaxEMIn = document.createElement('p')
        divCard.classList.toggle('card-previsao')

        pDia.innerText = `${chave}`
        verificacaoIconClima(info[chave].clima, previsaoIcon)
        pMaxEMIn.innerText = `${info[chave].min.toFixed(0)}° ${info[chave].max.toFixed(0)}°`

        divCard.append(pDia, previsaoIcon, pMaxEMIn)
        sectionPrevisao.appendChild(divCard) 
    }
    
    timezoneUsuario = info.hoje.timezone // atualiza o timezone o usuario para funcao de data e hora
}

const hora = document.querySelector('#hora')
const data = document.querySelector('#data')
const dia = document.querySelector('#dia')

setInterval(() => { // atualiza data e hora a cada segundo
    if (!timezoneUsuario) return // aguarda o timezone ser definido

    const agora = new Date()
    const deslocamentoLocal = agora.getTimezoneOffset() *60 *1000
    const relogioMestre = agora.getTime() +  deslocamentoLocal
    const deslocamentoUsuario =  timezoneUsuario * 1000
    const horaAtual = relogioMestre + deslocamentoUsuario
    const tempoFormatado = new Date(horaAtual)  

    hora.innerText = tempoFormatado.toLocaleTimeString('pt-BR')
    data.innerText = `${tempoFormatado.getDate()} de ${mes[tempoFormatado.getMonth()]} de ${tempoFormatado.getFullYear()} `
    dia.innerText = `${diaSemana[tempoFormatado.getDay()]}`

}, 1000)

async function dadosLocais() { // busca dados do clima baseado na localizacao do usuario
    const cidadeAtual = await localizacao()
    dadosClima(buscarDadosClima(cidadeAtual))
}

dadosLocais() 

const enviar = document.querySelector('button')
enviar.addEventListener('click', async () => {
    if( input.value === '') {
            erroAviso('Digite o nome de uma cidade')
            return
    }

    const d = await buscarDadosClima(input.value.trim('')) 
    dadosClima(d) 
    
})

/*atualizações e melhorias: 

  -- separa o código principal em funções menores para reutilizar e facilitar a leitura
  -- adiciona verificação para evitar que resposta antigas sobrescrevam a tela
  -- função erroAviso agora aceita tanto objetos de erro quanto strings simples
  -- remove código comentado e desnecessário
  -- adiciona função de geoolocalização para buscar latitude e longitude do usuario
  -- adiciona função localizacao para converter lat e long em endereço legível
  -- codigo inicia pedindo permissão de localização para iniciar com a cidade atual do usuario
  -- adiciona comentarios explicativos para facilitar entendimento do código
  

*/