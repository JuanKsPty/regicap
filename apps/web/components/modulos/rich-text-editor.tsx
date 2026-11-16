'use client';

import { Bold, Eraser, Italic, Link2, List, ListOrdered, Quote } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@regicap/ui';

const MAX = 3000;

function Boton({ titulo, onClick, children }: { titulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={titulo} aria-label={titulo} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="grid size-8 place-items-center rounded-md text-fg-2 hover:bg-bg-2 hover:text-fg">
      {children}
    </button>
  );
}

/**
 * Editor de lecturas (negrita, cursiva, listas, cita, enlace). El HTML resultante
 * se SANEA siempre en la API antes de guardarse.
 */
export function RichTextEditor({ inicial = '', onChange, error, id }: { inicial?: string; onChange: (html: string, texto: string) => void; error?: string; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [largo, setLargo] = useState(0);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = inicial;
      setLargo(ref.current.innerText.trim().length);
    }
    // Solo al montar: el contenido pasa a ser del DOM (editor no controlado)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitir = () => {
    const el = ref.current;
    if (!el) return;
    const texto = el.innerText.replace(/\n$/, '');
    setLargo(texto.trim().length);
    onChange(el.innerHTML === '<br>' ? '' : el.innerHTML, texto);
  };
  const cmd = (c: string, v?: string) => {
    ref.current?.focus();
    document.execCommand(c, false, v);
    emitir();
  };

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card', error ? 'border-danger' : 'border-border focus-within:border-primary')}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-bg-2/50 px-1.5 py-1">
        <Boton titulo="Negrita" onClick={() => cmd('bold')}>
          <Bold className="size-3.5" />
        </Boton>
        <Boton titulo="Cursiva" onClick={() => cmd('italic')}>
          <Italic className="size-3.5" />
        </Boton>
        <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        <Boton titulo="Lista con viñetas" onClick={() => cmd('insertUnorderedList')}>
          <List className="size-3.5" />
        </Boton>
        <Boton titulo="Lista numerada" onClick={() => cmd('insertOrderedList')}>
          <ListOrdered className="size-3.5" />
        </Boton>
        <Boton titulo="Cita" onClick={() => cmd('formatBlock', 'blockquote')}>
          <Quote className="size-3.5" />
        </Boton>
        <Boton
          titulo="Insertar enlace"
          onClick={() => {
            const url = window.prompt('URL del enlace:', 'https://');
            if (url && /^(https?:\/\/|mailto:)/i.test(url)) cmd('createLink', url);
          }}
        >
          <Link2 className="size-3.5" />
        </Boton>
        <Boton titulo="Limpiar formato" onClick={() => cmd('removeFormat')}>
          <Eraser className="size-3.5" />
        </Boton>
      </div>
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Contenido de la lectura"
        aria-invalid={!!error}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Escribe el contenido de la lectura que verá el participante…"
        onInput={emitir}
        onPaste={(e) => {
          // Pega solo texto plano: evita arrastrar estilos externos
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
        className="contenido-rico min-h-32 max-h-80 overflow-y-auto px-3 py-2.5 text-[13px] leading-relaxed focus:outline-none"
      />
      <div className={cn('border-t border-border-subtle px-3 py-1 text-right text-[11px]', largo > MAX ? 'font-semibold text-danger-fg' : 'text-fg-3')}>
        {largo} / {MAX}
      </div>
    </div>
  );
}
