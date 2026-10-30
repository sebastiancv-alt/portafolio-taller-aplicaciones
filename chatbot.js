/* ═══════════════════════════════════════════════════════════════
   CHATBOT DEL PORTAFOLIO
   Responde preguntas sobre los trabajos, semanas, temas y archivos.
   - Lee el propio index.html cada vez que se hace una pregunta, así que
     cuando agregues una semana nueva el bot la conoce automáticamente.
   - Funciona sin internet y sin claves de API.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ──────────────── CONFIGURACIÓN ──────────────── */
  const CONFIG = {
    titulo: 'Asistente del portafolio',
    /* OPCIONAL: URL de TU backend con una IA (ver instrucciones).
       Si lo dejas vacío, el bot usa su motor de búsqueda local. */
    apiUrl: '',
    sugerencias: [
      '¿Qué trabajos he entregado?',
      '¿Qué falta por entregar?',
      'Resumen de la semana 5',
      '¿Qué archivos SQL hay?',
      '¿Qué temas se vieron?',
      '¿Qué es Maven?'
    ]
  };

  /* ──────────────── TEMAS DEL CURSO ────────────────
     Descripción de lo que trata cada grupo de trabajos.
     EDÍTALOS con tus propias palabras: mientras más detallados,
     mejores serán las respuestas del bot.
     - semanas: semanas donde aparece el tema
     - claves:  palabras con las que alguien podría preguntar por él   */
  const TEMAS = [
    {
      titulo: 'Diseño de interfaces con Figma',
      semanas: [1, 4],
      claves: ['figma', 'diseno', 'prototipo', 'interfaz', 'pantalla', 'ui', 'ux', 'dashboard', 'login', 'inicio de sesion', 'banca', 'hipotenusa'],
      texto: 'Diseño de aplicaciones web en Figma. En la semana 1: calculadoras (hipotenusa de un triángulo rectángulo, área y perímetro de un rectángulo) y pantallas de inicio de sesión (universidad y banca en línea). En la semana 4: un modelo de dashboard de gestión de productos (Web Product Management Dashboard) hecho con Figma Make.'
    },
    {
      titulo: 'Cálculos geométricos y proyecto de calculadoras',
      semanas: [2],
      claves: ['pitagoras', 'teorema', 'area', 'perimetro', 'rectangulo', 'hipotenusa', 'geometria', 'calculadora', 'geometrica'],
      texto: 'Aplicaciones para el teorema de Pitágoras y para el área y perímetro del rectángulo, con un documento PDF y el proyecto comprimido «Calculadoras geométricas».'
    },
    {
      titulo: 'Maven y POM XML',
      semanas: [2],
      claves: ['maven', 'pom', 'xml', 'dependencias', 'gestion de proyectos', 'construccion', 'build'],
      texto: 'Conceptos de Maven, la herramienta que automatiza la construcción y la gestión de dependencias de un proyecto, y del archivo pom.xml (Project Object Model), donde se define la configuración del proyecto.'
    },
    {
      titulo: 'Cálculo de importes, descuentos y obsequios',
      semanas: [3],
      claves: ['importe', 'pagar', 'compra', 'descuento', 'obsequio', 'caramelos', 'lapiceros', 'tienda', 'viaje', 'actividad', 'operaciones'],
      texto: 'Actividades 1 y 2 de la semana 3: determinar el importe a pagar, el importe de la compra, el descuento y los obsequios (lapiceros y caramelos), más dos proyectos comprimidos: la tienda (Act1) y el viaje (Act2).'
    },
    {
      titulo: 'Instalación de SQL Server y Microsoft Azure',
      semanas: [5],
      claves: ['sql server', 'sqlserver', 'azure', 'microsoft', 'instalacion', 'instalar', 'manual', 'nube', 'gestor'],
      texto: 'Manuales en PDF sobre cómo instalar SQL Server y sobre Microsoft Azure.'
    },
    {
      titulo: 'Modelado de la base de datos (proyecto GesPro)',
      semanas: [5, 6],
      claves: ['modelo', 'conceptual', 'logico', 'fisico', 'entidad', 'relacion', 'tablas', 'base de datos', 'bd', 'gespro', 'productos', 'sistema de productos', 'script', 'sql'],
      texto: 'Diseño de la base de datos del proyecto GesPro por niveles: modelo conceptual y modelo lógico (semana 5, en imágenes) y modelo físico (semana 6), con su informe en PDF y el script SQL del sistema de productos.'
    },
    {
      titulo: 'Módulo de login de GesPro',
      semanas: [7],
      claves: ['login', 'inicio de sesion', 'sesion', 'usuario', 'usuarios', 'autenticacion', 'gespro', 'modulo', 'sql'],
      texto: 'Módulo de inicio de sesión del proyecto GesPro: informe en PDF y script SQL (login_gespro).'
    }
  ];

  /* ──────────────── UTILIDADES DE TEXTO ──────────────── */
  const STOP = new Set(('a al algo ante con contra cual cuales cuando cuanto cuantos cuantas de del desde donde el ella ellos en entre ' +
    'era es esta estan este esto estos fue ha han hay la las le les lo los me mi mis mas muy no nos o para pero por que se si sin ' +
    'sobre su sus te tu tus un una uno unos y ya yo tengo tiene tienen puedes puedo quiero dime dame decir podrias favor porfa ' +
    'ver mostrar muestrame como cual quien quienes he has son soy hay existe existen').split(' '));

  const norm = s => String(s).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const stem = w => (w.length > 4 && w.endsWith('es')) ? w.slice(0, -2)
    : (w.length > 3 && w.endsWith('s')) ? w.slice(0, -1) : w;

  const tokens = s => norm(s).split(' ').filter(t => t && !STOP.has(t)).map(stem);

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmt = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

  const plural = (n, s, p) => n === 1 ? `${n} ${s}` : `${n} ${p}`;

  function rangos(nums) {
    nums = [...nums].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < nums.length;) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      out.push(j > i ? `${nums[i]}–${nums[j]}` : `${nums[i]}`);
      i = j + 1;
    }
    return out.join(', ');
  }

  const semanasTxt = n => `${n.length === 1 && !String(rangos(n)).includes('–') ? 'semana' : 'semanas'} ${rangos(n)}`;

  const listaSemanas = n => n.length === 1 ? `la semana ${n[0]}` : `las semanas ${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`;

  /* ──────────────── LECTURA DEL PORTAFOLIO (index.html) ──────────────── */
  function escanear() {
    const txt = (root, sel) => (root.querySelector(sel)?.textContent || '').replace(/\s+/g, ' ').trim();
    const perfil = {
      nombre: txt(document, '.hero-name'),
      subtitulo: txt(document, '.hero-subtitle'),
      descripcion: txt(document, '.hero-desc'),
      institucion: txt(document, '.inst-label'),
      anio: txt(document, '.badge-year')
    };
    const unidades = [];
    document.querySelectorAll('.accordion-item').forEach(u => {
      const titulo = txt(u, '.unit-title');
      const unidad = { titulo, meta: txt(u, '.unit-meta'), num: parseInt((titulo.match(/\d+/) || [0])[0], 10), semanas: [] };
      u.querySelectorAll('.week-card').forEach(w => {
        const num = parseInt((txt(w, '.week-label').match(/\d+/) || [0])[0], 10);
        const archivos = [...w.querySelectorAll('.file-row')].map(r => {
          const dl = r.querySelector('.btn-download'), ver = r.querySelector('.btn-view'), lk = r.querySelector('.btn-link');
          const archivoUrl = (dl || ver)?.getAttribute('href') || '';
          return {
            nombre: txt(r, '.file-name'),
            archivo: txt(r, '.file-meta'),
            tipo: txt(r, '.file-icon').toUpperCase(),
            semana: num,
            unidad: unidad.num,
            url: archivoUrl,
            enlace: lk?.getAttribute('href') || '',
            descargable: !!dl && !ver
          };
        });
        unidad.semanas.push({ num, unidad: unidad.num, entregada: w.classList.contains('done'), archivos });
      });
      unidades.push(unidad);
    });
    const semanas = unidades.flatMap(u => u.semanas).sort((a, b) => a.num - b.num);
    return { perfil, unidades, semanas, archivos: semanas.flatMap(s => s.archivos) };
  }

  /* ──────────────── BÚSQUEDA (para preguntas libres) ──────────────── */
  function buscar(q, D) {
    const docs = [];
    D.archivos.forEach(a => docs.push({
      kind: 'archivo', ref: a, titulo: a.nombre,
      texto: `${a.nombre} ${a.archivo} ${a.tipo} semana ${a.semana} unidad ${a.unidad}`
    }));
    TEMAS.forEach(t => docs.push({
      kind: 'tema', ref: t, titulo: t.titulo,
      texto: `${t.titulo} ${t.claves.join(' ')} ${t.texto}`
    }));
    docs.forEach(d => { d.tk = tokens(d.texto); d.tt = tokens(d.titulo); });

    const qt = [...new Set(tokens(q))];
    if (!qt.length) return [];
    const match = (dtk, t) => dtk.some(d => d === t || (t.length >= 5 && d.startsWith(t)) || (d.length >= 5 && t.startsWith(d)));
    const N = docs.length;
    const idf = {};
    qt.forEach(t => { idf[t] = Math.log(1 + N / (docs.filter(d => match(d.tk, t)).length + 0.5)); });
    const total = qt.reduce((s, t) => s + idf[t], 0);

    return docs.map(d => {
      let sc = 0, cov = 0;
      qt.forEach(t => {
        if (match(d.tk, t)) { sc += idf[t]; cov += idf[t]; if (match(d.tt, t)) sc += idf[t] * 0.5; }
      });
      return { d, sc, cov: cov / total };
    }).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc);
  }

  /* ──────────────── RESPUESTAS ──────────────── */
  const entregadas = D => D.semanas.filter(s => s.entregada);
  const pendientes = D => D.semanas.filter(s => !s.entregada);
  const temasDe = (D, semana) => TEMAS.filter(t => t.semanas.includes(semana));

  function archivosDeTema(D, t) {
    const deSemana = D.archivos.filter(a => t.semanas.includes(a.semana));
    const claves = [t.titulo, ...t.claves].map(norm).filter(Boolean);
    const coincide = a => {
      const txt = norm(`${a.nombre} ${a.archivo}`);
      return claves.some(c => new RegExp('\\b' + c + (c.length >= 4 ? '' : '\\b')).test(txt));
    };
    const f = deSemana.filter(coincide);
    return f.length ? f : deSemana;
  }

  function respAyuda() {
    return {
      texto: 'Puedo ayudarte con cosas como:\n• Qué trabajos hay en una semana o unidad («semana 5»)\n• Qué falta por entregar y cuál es el avance\n• Cuántos archivos hay y de qué tipo (PDF, PNG, SQL, ZIP, Figma)\n• De qué trata cada tema (Maven, modelos de base de datos, login…)\n• Darte el enlace para ver o descargar un archivo\n\nPrueba con una de las sugerencias de abajo o escribe tu propia pregunta.'
    };
  }

  function respPerfil(D) {
    const p = D.perfil;
    return { texto: `**${p.nombre}**\n${p.subtitulo}\n${p.institucion} · ${p.anio}\n\n${p.descripcion}` };
  }

  function respEstructura(D) {
    const lineas = D.unidades.map(u => `• **${u.titulo}**: ${u.meta.replace(' · Taller de Aplicaciones 1', '')}`);
    return { texto: `El curso (Taller de Aplicaciones 1) tiene **${D.unidades.length} unidades** y **${D.semanas.length} semanas** en total.\n${lineas.join('\n')}` };
  }

  function respSemana(D, n) {
    const s = D.semanas.find(x => x.num === n);
    if (!s) return { texto: `La semana ${n} no existe en el portafolio. El curso tiene las semanas 1 a ${D.semanas.length}.` };
    if (!s.entregada) return { texto: `**Semana ${n}** (Unidad ${s.unidad}): todavía no tiene archivos, está **pendiente**.` };
    const tem = temasDe(D, n);
    let t = `**Semana ${n}** (Unidad ${s.unidad}) · entregada con **${plural(s.archivos.length, 'trabajo', 'trabajos')}**.`;
    if (tem.length) t += '\n\n' + tem.map(x => `**${x.titulo}:** ${x.texto}`).join('\n\n');
    return { texto: t, archivos: s.archivos };
  }

  function respUnidad(D, n) {
    const u = D.unidades.find(x => x.num === n);
    if (!u) return { texto: `No encontré la unidad ${n}. El curso tiene ${D.unidades.length} unidades.` };
    const ent = u.semanas.filter(s => s.entregada), pen = u.semanas.filter(s => !s.entregada);
    const nArch = ent.reduce((s, w) => s + w.archivos.length, 0);
    let t = `**${u.titulo}** (${u.meta.replace(' · Taller de Aplicaciones 1', '')}).\n`;
    t += ent.length ? `• Entregadas: ${semanasTxt(ent.map(s => s.num))} (${plural(nArch, 'archivo', 'archivos')})\n` : '• Aún no hay semanas entregadas\n';
    t += pen.length ? `• Pendientes: ${semanasTxt(pen.map(s => s.num))}` : '• No hay semanas pendientes';
    return { texto: t };
  }

  function respPendientes(D) {
    const pen = pendientes(D);
    if (!pen.length) return { texto: '¡Todas las semanas están entregadas! 🎉' };
    const porUnidad = D.unidades.map(u => {
      const p = u.semanas.filter(s => !s.entregada).map(s => s.num);
      return p.length ? `• **Unidad ${u.num}:** ${semanasTxt(p)}` : null;
    }).filter(Boolean);
    return { texto: `Faltan **${pen.length} de ${D.semanas.length}** semanas por entregar:\n${porUnidad.join('\n')}` };
  }

  function respAvance(D) {
    const e = entregadas(D).length, t = D.semanas.length;
    const pct = t ? Math.round(e * 100 / t) : 0;
    return { texto: `Avance del curso: **${e} de ${t}** semanas entregadas (**${pct}%**).\nÚltima semana entregada: **semana ${Math.max(0, ...entregadas(D).map(s => s.num))}**.` };
  }

  function contarPorTipo(archivos) {
    const c = {};
    archivos.forEach(a => { c[a.tipo || 'OTRO'] = (c[a.tipo || 'OTRO'] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(' · ');
  }

  function respConteo(D) {
    return {
      texto: `Hay **${plural(D.archivos.length, 'archivo', 'archivos')}** entregados en **${plural(entregadas(D).length, 'semana', 'semanas')}**.\nPor tipo → ${contarPorTipo(D.archivos)}`
    };
  }

  function respEntregados(D) {
    const lineas = entregadas(D).map(s => `• **Semana ${s.num}:** ${plural(s.archivos.length, 'trabajo', 'trabajos')}`);
    return { texto: `Llevo **${plural(D.archivos.length, 'archivo', 'archivos')}** en ${plural(entregadas(D).length, 'semana', 'semanas')}:\n${lineas.join('\n')}\n\nPregúntame por una semana concreta para ver sus archivos.` };
  }

  function respTipo(D, nombre, test) {
    const f = D.archivos.filter(test);
    if (!f.length) return { texto: `Todavía no hay archivos ${nombre} en el portafolio.` };
    const sem = [...new Set(f.map(a => a.semana))];
    return { texto: `Hay **${plural(f.length, 'archivo', 'archivos')} ${nombre}** (${semanasTxt(sem)}):`, archivos: f.slice(0, 25) };
  }

  function respResumen(D) {
    const ent = entregadas(D);
    const temas = TEMAS.filter(t => t.semanas.some(s => ent.some(e => e.num === s)));
    return {
      texto: `Este portafolio reúne los trabajos de **Taller de Aplicaciones 1** de **${D.perfil.nombre}**. Hay **${plural(D.archivos.length, 'archivo', 'archivos')}** en ${plural(ent.length, 'semana', 'semanas')} entregadas (${contarPorTipo(D.archivos)}).\n\n**Temas trabajados:**\n` +
        temas.map(t => `• ${t.titulo} (${listaSemanas(t.semanas).replace('la semana', 'sem.').replace('las semanas', 'sem.')})`).join('\n') +
        '\n\nPregúntame por cualquier tema para ver el detalle.'
    };
  }

  function respBusqueda(q, D) {
    const r = buscar(q, D);
    if (!r.length || r[0].cov < 0.45) return null;
    const top = r.slice(0, 4);
    const tema = top.find(x => x.d.kind === 'tema' && x.cov >= 0.45);
    if (tema && (top[0].d.kind === 'tema' || tema.sc >= top[0].sc * 0.8)) {
      const t = tema.d.ref;
      const arch = archivosDeTema(D, t);
      const entreg = t.semanas.filter(n => D.semanas.some(s => s.num === n && s.entregada));
      return {
        texto: `**${t.titulo}**\n${t.texto}` + (entreg.length ? `\n\nSe trabajó en ${listaSemanas(entreg)}.` : ''),
        archivos: arch.slice(0, 8)
      };
    }
    const arch = top.filter(x => x.d.kind === 'archivo' && x.cov >= 0.45).map(x => x.d.ref);
    if (!arch.length) return null;
    return {
      texto: arch.length === 1
        ? `Encontré esto en la **semana ${arch[0].semana}**:`
        : 'Esto es lo más relacionado que encontré en el portafolio:',
      archivos: arch
    };
  }

  /* ──────────────── INTERPRETACIÓN DE LA PREGUNTA ──────────────── */
  const ORD = { primera: 1, primer: 1, segunda: 2, tercera: 3, cuarta: 4, quinta: 5, sexta: 6, septima: 7, octava: 8, novena: 9, decima: 10 };

  function numeroDe(q, palabra) {
    let m = q.match(new RegExp(palabra + '\\w*\\s*(?:numero\\s*|n\\s*)?(\\d{1,2})\\b'));
    if (m) return parseInt(m[1], 10);
    for (const k in ORD) {
      if (new RegExp('\\b' + k + '\\b').test(q) && new RegExp(palabra).test(q)) return ORD[k];
    }
    return null;
  }

  function responderLocal(raw) {
    const D = escanear();
    const q = norm(raw);
    const t = re => new RegExp(re).test(q);

    if (!q) return respAyuda();
    if (t('^(hola|holi|hey|buenas|buenos dias|buen dia|que tal|saludos)\\b') && q.split(' ').length <= 4)
      return { texto: `¡Hola! Soy el asistente del portafolio de **${D.perfil.nombre}**. Pregúntame por sus trabajos, semanas, temas o archivos.` };
    if (t('\\b(gracias|thanks|genial|perfecto|ok gracias)\\b') && q.split(' ').length <= 4)
      return { texto: '¡De nada! Si quieres saber algo más del portafolio, aquí estoy.' };
    if (t('\\b(ayuda|que puedes hacer|que sabes|como funcionas|como te uso|que haces|comandos)\\b')) return respAyuda();
    if (t('\\b(quien eres|que eres|eres un bot|eres una ia)\\b'))
      return { texto: `Soy el asistente de este portafolio. Reviso las unidades, semanas y archivos de la página y respondo con esa información. No invento datos: si algo no está en el portafolio, te lo digo.` };
    if (t('\\b(quien es|quien hizo|de quien|autor|dueno|estudiante|alumno|universidad|carrera|ciclo|upla|nombre)\\b') && !t('semana|unidad|archivo'))
      return respPerfil(D);

    if (t('\\bcuant[ao]s?\\s+(unidades|semanas)\\b') || t('\\b(estructura|como esta organizado)\\b') || (t('\\bunidades\\b') && !numeroDe(q, 'unidad')))
      return respEstructura(D);

    const nSem = numeroDe(q, 'semana');
    if (nSem !== null) return respSemana(D, nSem);
    if (t('\\b(ultima semana|semana mas reciente|ultimo trabajo|ultimos trabajos|lo mas reciente|lo ultimo)\\b'))
      return respSemana(D, Math.max(...entregadas(D).map(s => s.num)));

    const nUni = numeroDe(q, 'unidad');
    if (nUni !== null) return respUnidad(D, nUni);

    if (t('\\b(pendiente|pendientes|falta|faltan|faltantes|por entregar|sin entregar|no he entregado|todavia no|aun no)\\b')) return respPendientes(D);
    if (t('\\b(avance|progreso|porcentaje|cuanto llevo|va el curso)\\b')) return respAvance(D);

    const tipos = [
      ['PDF', /\bpdf\b|\bdocumentos?\b|\binformes?\b|\bmanuales\b/, a => a.tipo === 'PDF'],
      ['PNG (imágenes)', /\bpng\b|\bimagen(es)?\b|\bcapturas?\b|\bfotos?\b/, a => a.tipo === 'PNG'],
      ['SQL', /\bsql\b|\bscripts?\b/, a => a.tipo === 'SQL'],
      ['ZIP', /\bzip\b|\bcomprimidos?\b/, a => a.tipo === 'ZIP'],
      ['de Figma', /\bfigma\b|\benlaces?\b|\blinks?\b/, a => a.tipo === 'FIG' || /figma\.com/.test(a.enlace)]
    ];
    const pideTipo = tipos.find(x => x[1].test(q));
    const pideLista = t('\\b(archivos?|trabajos?|entregas?|que hay|lista|listado|cuales|muestra|dame|todos)\\b');
    if (pideTipo && !t('\\b(que es|que son|explica|trata)\\b') && (pideLista || q.split(' ').length <= 3)) {
      if (t('\\bcuant[ao]s?\\b')) {
        const f = D.archivos.filter(pideTipo[2]);
        return { texto: `Hay **${plural(f.length, 'archivo', 'archivos')} ${pideTipo[0]}**.`, archivos: f.slice(0, 25) };
      }
      return respTipo(D, pideTipo[0], pideTipo[2]);
    }

    if (t('\\bcuant[ao]s?\\b') && t('\\b(archivos?|trabajos?|entregas?|tareas?|actividades)\\b')) return respConteo(D);
    if (t('\\b(entregado|entregados|entregue|he subido|subido|subidos|completado|hecho|realizado|tengo subido)\\b')) return respEntregados(D);
    if (t('\\b(temas?|aprendi|aprendido|contenido|resumen|resumeme|de que trata|que contiene|portafolio|vistos?|cursos?)\\b') && !t('\\b(que es|que son)\\b'))
      return respResumen(D);

    return respBusqueda(raw, D) || {
      texto: 'No encontré eso en el portafolio. Puedo contarte sobre las semanas, los temas (Figma, Maven, modelos de base de datos, login…), los archivos entregados o lo que falta por entregar.',
      sugerir: true
    };
  }

  /* ──────────────── (OPCIONAL) IA EXTERNA ──────────────── */
  function contextoParaIA(D) {
    const l = [`Portafolio de ${D.perfil.nombre}. ${D.perfil.subtitulo}. ${D.perfil.institucion}.`];
    D.semanas.forEach(s => {
      l.push(`Semana ${s.num} (Unidad ${s.unidad}): ${s.entregada ? 'entregada' : 'pendiente'}`);
      s.archivos.forEach(a => l.push(`  - ${a.nombre} [${a.tipo}] ${a.archivo}`));
    });
    TEMAS.forEach(t => l.push(`Tema: ${t.titulo}. ${t.texto}`));
    return l.join('\n');
  }

  async function responder(raw) {
    if (CONFIG.apiUrl) {
      try {
        const r = await fetch(CONFIG.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pregunta: raw, contexto: contextoParaIA(escanear()) })
        });
        const j = await r.json();
        if (j && j.respuesta) return { texto: String(j.respuesta) };
      } catch (e) { console.warn('Chatbot: la IA externa falló, uso el motor local.', e); }
    }
    return responderLocal(raw);
  }

  /* ──────────────── INTERFAZ ──────────────── */
  function crearUI() {
    const root = document.createElement('div');
    root.className = 'cb-root';
    root.innerHTML = `
      <button class="cb-fab" type="button" aria-label="Abrir ${esc(CONFIG.titulo)}" aria-expanded="false">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/><circle cx="9" cy="12" r=".6" fill="currentColor"/><circle cx="13" cy="12" r=".6" fill="currentColor"/><circle cx="17" cy="12" r=".6" fill="currentColor"/></svg>
      </button>
      <section class="cb-panel" role="dialog" aria-label="${esc(CONFIG.titulo)}" hidden>
        <header class="cb-head">
          <div class="cb-avatar" aria-hidden="true">AI</div>
          <div class="cb-head-text">
            <div class="cb-title">${esc(CONFIG.titulo)}</div>
            <div class="cb-sub">Pregúntame por mis trabajos</div>
          </div>
          <button class="cb-close" type="button" aria-label="Cerrar chat">×</button>
        </header>
        <div class="cb-log" role="log" aria-live="polite"></div>
        <div class="cb-chips"></div>
        <form class="cb-form" autocomplete="off">
          <input class="cb-input" type="text" maxlength="200" placeholder="Escribe tu pregunta…" aria-label="Escribe tu pregunta" />
          <button class="cb-send" type="submit" aria-label="Enviar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </section>`;
    document.body.appendChild(root);

    const $ = s => root.querySelector(s);
    const fab = $('.cb-fab'), panel = $('.cb-panel'), log = $('.cb-log'),
          chips = $('.cb-chips'), form = $('.cb-form'), input = $('.cb-input');
    let saludado = false, ocupado = false;

    const bajar = () => { log.scrollTop = log.scrollHeight; };

    function chipArchivo(a) {
      const href = a.url || a.enlace;
      const el = document.createElement('a');
      el.className = 'cb-file';
      el.href = href;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
      if (a.descargable && a.url) el.setAttribute('download', a.archivo || '');
      const tipo = document.createElement('span');
      tipo.className = 'cb-file-type';
      tipo.textContent = a.tipo || 'ARCH';
      const nom = document.createElement('span');
      nom.className = 'cb-file-name';
      nom.textContent = `S${a.semana} · ${a.nombre}`;
      el.append(tipo, nom);
      return el;
    }

    function agregar(rol, r) {
      const m = document.createElement('div');
      m.className = 'cb-msg ' + rol;
      const b = document.createElement('div');
      b.className = 'cb-bubble';
      if (rol === 'user') b.textContent = r;
      else {
        b.innerHTML = fmt(r.texto);
        if (r.archivos && r.archivos.length) {
          const lst = document.createElement('div');
          lst.className = 'cb-files';
          r.archivos.filter(a => a.url || a.enlace).forEach(a => lst.appendChild(chipArchivo(a)));
          b.appendChild(lst);
        }
      }
      m.appendChild(b);
      log.appendChild(m);
      /* las respuestas largas se muestran desde su inicio */
      if (rol === 'bot') log.scrollTop = Math.max(0, m.offsetTop - 10);
      else bajar();
    }

    function escribiendo() {
      const m = document.createElement('div');
      m.className = 'cb-msg bot';
      m.innerHTML = '<div class="cb-bubble cb-typing"><i></i><i></i><i></i></div>';
      log.appendChild(m);
      bajar();
      return m;
    }

    async function enviar(texto) {
      texto = texto.trim();
      if (!texto || ocupado) return;
      ocupado = true;
      agregar('user', texto);
      input.value = '';
      const t = escribiendo();
      const [r] = await Promise.all([responder(texto), new Promise(res => setTimeout(res, 380))]);
      t.remove();
      agregar('bot', r);
      ocupado = false;
      input.focus();
    }

    function abrir() {
      panel.hidden = false;
      requestAnimationFrame(() => root.classList.add('open'));
      fab.setAttribute('aria-expanded', 'true');
      if (!saludado) {
        saludado = true;
        const D = escanear();
        agregar('bot', {
          texto: `¡Hola! Soy el asistente del portafolio de **${D.perfil.nombre || 'este estudiante'}**. Puedo contarte qué trabajos hay en cada semana, de qué trata cada tema, qué falta por entregar y darte los enlaces para ver o descargar los archivos.\n\n¿Qué quieres saber?`
        });
      }
      setTimeout(() => input.focus(), 120);
    }

    function cerrar() {
      root.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
      setTimeout(() => { if (!root.classList.contains('open')) panel.hidden = true; }, 220);
      fab.focus();
    }

    CONFIG.sugerencias.forEach(s => {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'cb-chip';
      c.textContent = s;
      c.addEventListener('click', () => enviar(s));
      chips.appendChild(c);
    });

    fab.addEventListener('click', () => (root.classList.contains('open') ? cerrar() : abrir()));
    $('.cb-close').addEventListener('click', cerrar);
    form.addEventListener('submit', e => { e.preventDefault(); enviar(input.value); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('open')) cerrar(); });

    return { enviar, abrir };
  }

  function iniciar() {
    const ui = crearUI();
    /* Para pruebas desde la consola: PortafolioChatbot.preguntar('semana 5') */
    window.PortafolioChatbot = { preguntar: responderLocal, abrir: ui.abrir };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
