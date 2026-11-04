import { useEffect, useState } from 'react';
import { pushApi } from '../../api/index.js';
import { ativarAvisos, desativarAvisos, situacaoDosAvisos } from '../../utils/avisos.js';

const TEXTOS = {
  'iphone-instalar': 'No iPhone, os avisos funcionam com o TuneTalk na tela inicial: toque em Compartilhar → "Adicionar à Tela de Início" e abra por lá.',
  'sem-suporte': 'Este navegador não recebe avisos. No celular, use o Chrome (Android) ou adicione o TuneTalk à tela inicial (iPhone).',
  bloqueado: 'Os avisos estão bloqueados. Para receber, permita as notificações do TuneTalk nos ajustes do celular ou do navegador.',
};

/** Linha no topo das notificações para ligar/desligar os avisos no celular. */
export function AvisosNoCelular() {
  const [estado, setEstado] = useState('carregando');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [teste, setTeste] = useState('');

  useEffect(() => {
    let ativo = true;
    situacaoDosAvisos()
      .then(({ estado: novo }) => ativo && setEstado(novo))
      .catch(() => ativo && setEstado('desligado'));
    return () => { ativo = false; };
  }, []);

  const trocar = async (acao) => {
    setOcupado(true);
    setErro('');
    try {
      setEstado((await acao()).estado);
    } catch {
      setErro('Não deu para mudar os avisos agora. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  };

  const testar = async () => {
    setTeste('Enviando…');
    try {
      await pushApi.testar();
      setTeste('Aviso enviado. Pode levar alguns segundos para aparecer.');
    } catch (err) {
      setTeste(err.message || 'Não deu para enviar agora.');
    }
  };

  if (estado === 'carregando' || estado === 'desligado') return null;

  return (
    <div className="avisos-celular">
      <i className={`bi ${estado === 'ativado' ? 'bi-bell-fill' : 'bi-phone'}`} aria-hidden="true" />
      <div className="avisos-celular__texto">
        {estado === 'ativado' && (
          <>
            <p>Avisos no celular ativados.</p>
            <button type="button" className="avisos-celular__teste" onClick={testar}>Enviar aviso de teste</button>
            {teste && <p role="status">{teste}</p>}
          </>
        )}
        {estado === 'desativado' && <p>Receba um aviso no celular quando curtirem, comentarem ou te seguirem.</p>}
        {TEXTOS[estado] && <p>{TEXTOS[estado]}</p>}
        {erro && <p role="alert" className="avisos-celular__erro">{erro}</p>}
      </div>
      {estado === 'desativado' && (
        <button type="button" className="avisos-celular__botao" disabled={ocupado} onClick={() => trocar(ativarAvisos)}>
          {ocupado ? 'Ativando…' : 'Ativar'}
        </button>
      )}
      {estado === 'ativado' && (
        <button type="button" className="avisos-celular__botao is-secundario" disabled={ocupado} onClick={() => trocar(desativarAvisos)}>
          {ocupado ? 'Desativando…' : 'Desativar'}
        </button>
      )}
    </div>
  );
}
