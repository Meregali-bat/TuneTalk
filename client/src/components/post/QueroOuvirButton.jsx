import { useEffect, useState } from 'react';
import { queroOuvirApi } from '../../api/index.js';
import { tipoDaObra } from '../../../../shared/obra.js';

/**
 * Guarda (ou tira) um álbum/música da lista "Quero ouvir". `disco` é o post ou a obra
 * ({ tipo, titulo, artista, capa, releaseDate, preview }). Muda na hora e volta se falhar.
 */
export function QueroOuvirButton({ disco, salvo: salvoInicial, comTexto = false, onChange }) {
  const [salvo, setSalvo] = useState(Boolean(salvoInicial));
  const [enviando, setEnviando] = useState(false);
  useEffect(() => setSalvo(Boolean(salvoInicial)), [salvoInicial]);

  const alternar = async () => {
    const novo = !salvo;
    const item = {
      tipo: tipoDaObra(disco.tipo),
      titulo: disco.titulo,
      artista: disco.artista,
      capa: disco.capa,
      releaseDate: disco.releaseDate,
      preview: disco.preview,
    };
    setSalvo(novo);
    setEnviando(true);
    try {
      if (novo) await queroOuvirApi.add(item);
      else await queroOuvirApi.remove(item);
      onChange?.(novo);
    } catch {
      setSalvo(!novo);
    } finally {
      setEnviando(false);
    }
  };

  const rotulo = salvo ? 'Tirar do Quero ouvir' : 'Guardar no Quero ouvir';
  return (
    <button
      type="button"
      className={`quero-ouvir-button${salvo ? ' is-salvo' : ''}${comTexto ? ' quero-ouvir-button--texto' : ''}`}
      aria-label={comTexto ? undefined : rotulo}
      aria-pressed={salvo}
      title={rotulo}
      disabled={enviando}
      onClick={alternar}
    >
      <i className={salvo ? 'bi bi-bookmark-check-fill' : 'bi bi-bookmark-plus'} aria-hidden="true" />
      {comTexto && <span>{salvo ? 'Na sua lista' : 'Quero ouvir'}</span>}
    </button>
  );
}
