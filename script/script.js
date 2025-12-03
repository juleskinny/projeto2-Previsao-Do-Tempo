async function buscarPrevisao() {
   let respostaHoje, respostaPrevisao, input
   try{
        input = document.querySelector('input')
        const chave = 'a0973eee6736cb110e65b0cefff543e8'
        const cidade = input.value.trim()

        if(input.value === '') {
            throw new Error('Digite o nome de uma cidade');
        }

        const buscaClimaHoje = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${chave}&units=metric`)

        const buscaPrevisao = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&appid=${chave}&units=metric`)
        
       
        if(!buscaClimaHoje.ok  || !buscaPrevisao.ok) {
            const erroStatus = !buscaClimaHoje.ok 
                ? buscaClimaHoje.status
                : buscaPrevisao.status;

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
      
      const divPrincipal = document.querySelector(".info-principal")

      const mensagemAntiga = document.querySelector('.mensagem-erro')
      if(mensagemAntiga) mensagemAntiga.remove()

      const mensagemErro = document.createElement('p')
      mensagemErro.innerText = erro.message
      mensagemErro.classList.add('mensagem-erro')
      divPrincipal.appendChild(mensagemErro) 
      
      return
    }
    
    const semana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
    const previsao = {}
    previsao.hoje = {
        temperatura: respostaHoje.main.temp,
        min: null,
        max: null,
        clima: respostaHoje.weather[0].main,
        vento: respostaHoje.wind.speed,
        porcentagem_Chuva: null,
        umidade: respostaHoje.main.humidity,
        sensacao: respostaHoje.main.feels_like
    }


    respostaPrevisao.list.forEach(item => {
        const dataItem = item.dt_txt.split(' ')[0]
        const [ano, mes, dia] = dataItem.split('-')
        const diaSemana = new Date(ano, mes-1, dia)
        const previsaoDia = semana[diaSemana.getDay()]
        
        if(!previsao[previsaoDia]) {
            previsao[previsaoDia] = {
                min: Infinity,
                max: -Infinity,
                clima: null,
                chuva: -Infinity,
            }
        }

        const tempMin = item.main.temp_min
        const tempMax = item.main.temp_max

        if(tempMin < previsao[previsaoDia].min) { 
            previsao[previsaoDia].min = tempMin
        }
        if(tempMax > previsao[previsaoDia].max){
            previsao[previsaoDia].max = tempMax
        }
        
        if(!previsao[previsaoDia].clima) {
            previsao[previsaoDia].clima = item.weather[0].main
        }
        if(['Rain', 'Drizzle'].includes(item.weather[0].main)) { // sobrescrevendo caso em algum momento chova
             previsao[previsaoDia].clima = 'Rain'
        }

        const chanceschuva = Math.round(item.pop *100) // 
        if(chanceschuva > previsao[previsaoDia].chuva) { //pegando as chances de chuva e comparando para pegar a maior do dia todo
            previsao[previsaoDia].chuva = chanceschuva
        }
    });

    const hoje = new Date().getDay()
    previsao.hoje.porcentagem_Chuva = previsao[semana[hoje]].chuva
    previsao.hoje.max = previsao[semana[hoje]].max
    previsao.hoje.min = previsao[semana[hoje]].min
    delete previsao[semana[hoje]]

    const tempAtual = document.querySelector('#grauPrincipal')
    const minimaEMaxima = document.querySelector('#minMAx')
    const vento = document.querySelector('#vento')
    const chuva = document.querySelector('#chuva')
    const umidade = document.querySelector('#umidade')
    const iconFeelsLike = document.querySelector('#icon-clima')
    const valorTermico = document.querySelector('#valor-Termico')
    const hora = document.querySelector('#hora')
    const data = document.querySelector('#data')
    const dia = document.querySelector('#dia')
    const local = document.querySelector('#local')
    const sectionPrevisao = document.querySelector('#sectionPrevisao')
    
    function limparDuplicata(){
        tempAtual.innerHTML = ''
        local.innerHTML = ''
        sectionPrevisao.innerHTML = ''
    }
    
    limparDuplicata()

    tempAtual.innerHTML += `${previsao.hoje.temperatura.toFixed(0)}<span>°C</span>`
    minimaEMaxima.innerText = `${previsao.hoje.max.toFixed(0)}°  ${previsao.hoje.min.toFixed(0)}°`
    vento.innerText = `${previsao.hoje.vento.toFixed(0)}Km/h`
    chuva.innerText = `${previsao.hoje.porcentagem_Chuva}%`
    umidade.innerText = `${previsao.hoje.umidade}%`
    valorTermico.innerText = `${previsao.hoje.sensacao.toFixed(0)}°`

    function dataEHora(){
        const agora = new Date()
        const deslocamentoLocal = agora.getTimezoneOffset() *60 *1000
        const relogioMestre = agora.getTime() +  deslocamentoLocal
        const deslocamentoUsuario =  respostaHoje.timezone * 1000
        const horaAtual = relogioMestre + deslocamentoUsuario
        const tempoFormatado = new Date(horaAtual)  
        return tempoFormatado
    }

    const mes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    const diaSemana = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado']
    
    
    setInterval(() => {
        const resultado = dataEHora()
        hora.innerText = resultado.toLocaleTimeString('pt-BR')
        data.innerText = `${resultado.getDate()} de ${mes[resultado.getMonth()]} de ${resultado.getFullYear()} `
        dia.innerText = `${diaSemana[resultado.getDay()]}` 
    }, 1000)

    function captalize(frase) {
        let  fraseArray = frase.split(' ')
        let arrayFormatado = []
        for(let l of fraseArray) {
            arrayFormatado.push((l[0].toUpperCase() + l.slice(1)))
        }

        return arrayFormatado.join(' ')   
    }

    const iconLocal = document.createElement('img')
    iconLocal.src = '../assets/icons/local.svg'
    local.append(iconLocal, captalize(input.value))
    
    function verificacaoIconClima(chave, variavel) {
        switch (chave) {
            case 'Clouds':
                variavel.src = '../assets/icons/nublado.svg'
                break;
            case 'Rain':
                variavel.src = '../assets/icons/chuva.svg'
                break;
            case 'Clear':
                variavel.src = '../assets/icons/sol.svg'
                break;
            case 'Snow':
                variavel.src = '../assets/icons/snow.svg'
                variavel.style.width = 'clamp(30px, 9.5vw, 55px)'
                variavel.style.margin = '3px' 
                break;
            default:
                break;
       }
    }

    verificacaoIconClima(previsao.hoje.clima, iconFeelsLike)

    for(let chave of Object.keys(previsao)){ // percorrendo previsao para adiconar as mnimas e maximas dos proximos dias
        let divCard = document.createElement('div')
        let previsaoIcon = document.createElement('img')
        let pDia = document.createElement('p')
        let pMaxEMIn = document.createElement('p')
        divCard.classList.toggle('card-previsao')

        pDia.innerText = `${chave}`
        verificacaoIconClima(previsao[chave].clima, previsaoIcon)
        pMaxEMIn.innerText = `${previsao[chave].min.toFixed(0)}° ${previsao[chave].max.toFixed(0)}°`

        divCard.append(pDia, previsaoIcon, pMaxEMIn)
        sectionPrevisao.appendChild(divCard)
    } 
    
}

const enviar = document.querySelector('button')
enviar.addEventListener('click', buscarPrevisao)


