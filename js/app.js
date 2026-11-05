const API_BASE = 'https://69f225e3b15130b973529e63.mockapi.io/v1';

let estadoEstudiantes = [];
let estadoEstudiantesFiltrados = [];
let estadoCursos = [];
let estadoCursosFiltrados = [];
let mapaCursos = {};

let paginaActualEstudiantes = 1;
const porPagina = 10;

document.addEventListener('DOMContentLoaded', () => {
  cargarDatosIniciales();
});

async function cargarDatosIniciales() {
  await obtenerCursos();
  await obtenerEstudiantes();
}

function navegarA(idVista) {
  document.querySelectorAll('.vista-app').forEach(el => el.classList.add('d-none'));
  const target = document.getElementById(idVista);
  if (target) target.classList.remove('d-none');

  document.querySelectorAll('#menu-nav .nav-link').forEach(link => link.classList.remove('active'));
  
  const links = document.querySelectorAll('#menu-nav .nav-link');
  if (idVista.includes('estudiante') && links[0]) {
    links[idVista.includes('form') ? 1 : 0].classList.add('active');
  } else if (idVista.includes('curso') && links[2]) {
    links[idVista.includes('form') ? 3 : 2].classList.add('active');
  } else if (idVista === 'vista-reporte' && links[4]) {
    links[4].classList.add('active');
    generarReporte();
  }
}

async function obtenerCursos() {
  try {
    const res = await fetch(`${API_BASE}/cursos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    estadoCursos = data;
    estadoCursosFiltrados = data;
    
    mapaCursos = {};
    data.forEach(c => mapaCursos[c.id] = c.cnombre);

    renderizarTablaCursos();
    poblarSelectCursos();
  } catch (error) {
    console.error('Error al obtener cursos:', error);
  }
}

function renderizarTablaCursos() {
  const tbody = document.getElementById('tabla-cursos-body');
  if (!tbody) return;

  tbody.innerHTML = estadoCursosFiltrados.map(c => `
    <tr>
      <td>${c.id}</td>
      <td><strong>${c.cnombre || ''}</strong></td>
      <td>${c.codigo || ''}</td>
      <td>${c.creditos || ''}</td>
      <td>${c.docente || ''}</td>
      <td>${c.descripcion || ''}</td>
      <td>
        <button class="btn btn-warning btn-sm text-dark me-1" onclick="editarCurso('${c.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarCurso('${c.id}')">Eliminar</button>
      </td>
    </tr>
  `).join('');

  const infoPaginacion = document.getElementById('info-paginacion-cursos');
  if (infoPaginacion) {
    infoPaginacion.innerText = `Mostrando 1 a ${estadoCursosFiltrados.length} de ${estadoCursosFiltrados.length} registros`;
  }
}

function poblarSelectCursos() {
  const select = document.getElementById('estudiante-idCurso');
  if (!select) return;
  select.innerHTML = '<option value="">Seleccione un curso...</option>' + 
    estadoCursos.map(c => `<option value="${c.id}">${c.cnombre}</option>`).join('');
}

function filtrarCursos() {
  const input = document.getElementById('input-buscar-cursos');
  const q = input ? input.value.toLowerCase().trim() : '';
  if (!q) {
    estadoCursosFiltrados = estadoCursos;
  } else {
    estadoCursosFiltrados = estadoCursos.filter(c =>
      (c.cnombre && c.cnombre.toLowerCase().includes(q)) ||
      (c.codigo && c.codigo.toLowerCase().includes(q)) ||
      (c.docente && c.docente.toLowerCase().includes(q))
    );
  }
  renderizarTablaCursos();
}

function prepararFormularioCurso(curso = null) {
  const form = document.getElementById('form-curso');
  if (form) form.reset();

  if (curso) {
    document.getElementById('titulo-form-curso').innerText = 'Actualizar Curso';
    document.getElementById('curso-id').value = curso.id;
    document.getElementById('curso-id-display').value = curso.id;
    document.getElementById('curso-cnombre').value = curso.cnombre;
    document.getElementById('curso-codigo').value = curso.codigo;
    document.getElementById('curso-creditos').value = curso.creditos;
    document.getElementById('curso-docente').value = curso.docente;
    document.getElementById('curso-descripcion').value = curso.descripcion || '';
    
    document.getElementById('btn-guardar-curso').innerText = '🔄 Actualizar Datos';
  } else {
    document.getElementById('titulo-form-curso').innerText = 'Nuevo Curso';
    document.getElementById('curso-id').value = '';
    document.getElementById('curso-id-display').value = '(se genera automáticamente al guardar)';
    document.getElementById('btn-guardar-curso').innerText = 'Guardar Curso';
  }
  navegarA('vista-form-curso');
}

async function guardarCurso(e) {
  e.preventDefault();
  const id = document.getElementById('curso-id').value;
  const body = {
    cnombre: document.getElementById('curso-cnombre').value,
    codigo: document.getElementById('curso-codigo').value,
    creditos: Number(document.getElementById('curso-creditos').value),
    docente: document.getElementById('curso-docente').value,
    descripcion: document.getElementById('curso-descripcion').value
  };

  const url = id ? `${API_BASE}/cursos/${id}` : `${API_BASE}/cursos`;
  const method = id ? 'PUT' : 'POST';

  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  Swal.fire({ icon: 'success', title: id ? 'Curso actualizado' : 'Curso creado', timer: 1500, showConfirmButton: false });
  await cargarDatosIniciales();
  navegarA('vista-listado-cursos');
}

async function editarCurso(id) {
  const res = await fetch(`${API_BASE}/cursos/${id}`);
  const curso = await res.json();
  prepararFormularioCurso(curso);
}

async function eliminarCurso(id) {
  const curso = estadoCursos.find(c => String(c.id) === String(id));
  const estudiantesAsociados = estadoEstudiantes.filter(e => String(e.idCurso) === String(id));

  if (estudiantesAsociados.length > 0) {
    Swal.fire({
      icon: 'error',
      title: 'No se puede eliminar el curso',
      html: `«<strong>${curso ? curso.cnombre : 'Curso'}</strong>» tiene <strong>${estudiantesAsociados.length}</strong> estudiantes asociados.<br><small class="text-muted">Reasigna o elimina esos estudiantes primero.</small>`,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#0d6efd'
    });
    return;
  }

  const confirmacion = await Swal.fire({
    title: '¿Eliminar curso?',
    text: `Se eliminará el curso ${curso ? curso.cnombre : id}.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (confirmacion.isConfirmed) {
    await fetch(`${API_BASE}/cursos/${id}`, { method: 'DELETE' });
    Swal.fire({ icon: 'success', title: 'Curso eliminado', timer: 1500, showConfirmButton: false });
    await cargarDatosIniciales();
  }
}

async function obtenerEstudiantes() {
  try {
    const res = await fetch(`${API_BASE}/estudiantes`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    estadoEstudiantes = data;
    estadoEstudiantesFiltrados = data;
    paginaActualEstudiantes = 1;
    renderizarTablaEstudiantes();
  } catch (error) {
    console.error('Error al obtener estudiantes:', error);
  }
}

function renderizarTablaEstudiantes() {
  const tbody = document.getElementById('tabla-estudiantes-body');
  if (!tbody) return;

  const total = estadoEstudiantesFiltrados.length;
  const inicio = (paginaActualEstudiantes - 1) * porPagina;
  const fin = Math.min(inicio + porPagina, total);
  const paginaItems = estadoEstudiantesFiltrados.slice(inicio, fin);

  const formatearFecha = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  tbody.innerHTML = paginaItems.map(e => `
    <tr>
      <td>${e.id}</td>
      <td>${e.nombres || ''}</td>
      <td>${e.apellidos || ''}</td>
      <td>${e.email || ''}</td>
      <td>${e.edad || ''}</td>
      <td>${e.programa || ''}</td>
      <td>${mapaCursos[e.idCurso] || 'Sin Curso'}</td>
      <td>${formatearFecha(e.creado_a)}</td>
      <td>
        <button class="btn btn-warning btn-sm text-dark me-1" onclick="editarEstudiante('${e.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarEstudiante('${e.id}')">Eliminar</button>
      </td>
    </tr>
  `).join('');

  const infoPaginacion = document.getElementById('info-paginacion-estudiantes');
  if (infoPaginacion) {
    infoPaginacion.innerText = total > 0 
      ? `Mostrando ${inicio + 1} a ${fin} de ${total} registros` 
      : 'Mostrando 0 registros';
  }

  renderizarPaginadorEstudiantes(total);
}

function renderizarPaginadorEstudiantes(total) {
  const ul = document.getElementById('ul-paginacion-estudiantes');
  if (!ul) return;

  const totalPaginas = Math.ceil(total / porPagina);
  if (totalPaginas <= 1) {
    ul.innerHTML = '';
    return;
  }

  let html = `<li class="page-item ${paginaActualEstudiantes === 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" onclick="cambiarPaginaEstudiantes(${paginaActualEstudiantes - 1})">&laquo;</a>
  </li>`;

  for (let i = 1; i <= totalPaginas; i++) {
    html += `<li class="page-item ${i === paginaActualEstudiantes ? 'active' : ''}">
      <a class="page-link" href="#" onclick="cambiarPaginaEstudiantes(${i})">${i}</a>
    </li>`;
  }

  html += `<li class="page-item ${paginaActualEstudiantes === totalPaginas ? 'disabled' : ''}">
    <a class="page-link" href="#" onclick="cambiarPaginaEstudiantes(${paginaActualEstudiantes + 1})">&raquo;</a>
  </li>`;

  ul.innerHTML = html;
}

function cambiarPaginaEstudiantes(nuevaPagina) {
  const totalPaginas = Math.ceil(estadoEstudiantesFiltrados.length / porPagina);
  if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
    paginaActualEstudiantes = nuevaPagina;
    renderizarTablaEstudiantes();
  }
}

function filtrarEstudiantes() {
  const input = document.getElementById('input-buscar-estudiantes');
  const q = input ? input.value.toLowerCase().trim() : '';
  if (!q) {
    estadoEstudiantesFiltrados = estadoEstudiantes;
  } else {
    estadoEstudiantesFiltrados = estadoEstudiantes.filter(e => 
      (e.nombres && e.nombres.toLowerCase().includes(q)) ||
      (e.apellidos && e.apellidos.toLowerCase().includes(q)) ||
      (e.email && e.email.toLowerCase().includes(q)) ||
      (e.programa && e.programa.toLowerCase().includes(q)) ||
      (mapaCursos[e.idCurso] && mapaCursos[e.idCurso].toLowerCase().includes(q))
    );
  }
  paginaActualEstudiantes = 1;
  renderizarTablaEstudiantes();
}

function prepararFormularioEstudiante(estudiante = null) {
  const form = document.getElementById('form-estudiante');
  if (form) form.reset();

  if (estudiante) {
    document.getElementById('titulo-form-estudiante').innerText = 'Actualizar Estudiante';
    document.getElementById('estudiante-id').value = estudiante.id;
    document.getElementById('estudiante-id-display').value = estudiante.id;
    document.getElementById('estudiante-nombres').value = estudiante.nombres;
    document.getElementById('estudiante-apellidos').value = estudiante.apellidos;
    document.getElementById('estudiante-email').value = estudiante.email;
    document.getElementById('estudiante-edad').value = estudiante.edad;
    document.getElementById('estudiante-programa').value = estudiante.programa;
    document.getElementById('estudiante-idCurso').value = estudiante.idCurso;
    
    document.getElementById('btn-guardar-estudiante').innerText = '🔄 Actualizar Datos';
  } else {
    document.getElementById('titulo-form-estudiante').innerText = 'Nuevo Estudiante';
    document.getElementById('estudiante-id').value = '';
    document.getElementById('estudiante-id-display').value = '(se genera automáticamente al guardar)';
    document.getElementById('btn-guardar-estudiante').innerText = 'Guardar Estudiante';
  }
  navegarA('vista-form-estudiante');
}

async function guardarEstudiante(e) {
  e.preventDefault();
  const id = document.getElementById('estudiante-id').value;
  
  const body = {
    nombres: document.getElementById('estudiante-nombres').value,
    apellidos: document.getElementById('estudiante-apellidos').value,
    email: document.getElementById('estudiante-email').value,
    edad: Number(document.getElementById('estudiante-edad').value),
    programa: document.getElementById('estudiante-programa').value,
    idCurso: document.getElementById('estudiante-idCurso').value
  };

  if (!id) body.creado_a = new Date().toISOString();

  const url = id ? `${API_BASE}/estudiantes/${id}` : `${API_BASE}/estudiantes`;
  const method = id ? 'PUT' : 'POST';

  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  Swal.fire({ icon: 'success', title: id ? 'Estudiante actualizado' : 'Estudiante creado', timer: 1500, showConfirmButton: false });
  await obtenerEstudiantes();
  navegarA('vista-listado-estudiantes');
}

async function editarEstudiante(id) {
  const res = await fetch(`${API_BASE}/estudiantes/${id}`);
  const est = await res.json();
  prepararFormularioEstudiante(est);
}

async function eliminarEstudiante(id) {
  const est = estadoEstudiantes.find(e => String(e.id) === String(id));

  const confirmacion = await Swal.fire({
    title: '¿Eliminar estudiante?',
    html: `Se eliminará a <strong>${est ? est.nombres + ' ' + est.apellidos : ''}</strong> (ID ${id}).<br>Esta acción no se puede deshacer.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (confirmacion.isConfirmed) {
    await fetch(`${API_BASE}/estudiantes/${id}`, { method: 'DELETE' });
    Swal.fire({ icon: 'success', title: 'Estudiante eliminado', timer: 1500, showConfirmButton: false });
    await obtenerEstudiantes();
  }
}

function generarReporte() {
  const totalCursos = estadoCursos.length;
  const totalEstudiantes = estadoEstudiantes.length;

  const sumaEdadesGlobal = estadoEstudiantes.reduce((acc, curr) => acc + (Number(curr.edad) || 0), 0);
  const edadPromedioGlobal = totalEstudiantes > 0 ? (sumaEdadesGlobal / totalEstudiantes).toFixed(1) : 0;

  const mCursos = document.getElementById('metric-cursos');
  const mEst = document.getElementById('metric-estudiantes');
  const mEdad = document.getElementById('metric-edad');
  
  if (mCursos) mCursos.innerText = totalCursos;
  if (mEst) mEst.innerText = totalEstudiantes;
  if (mEdad) mEdad.innerText = edadPromedioGlobal;

  const fEst = document.getElementById('foot-total-estudiantes');
  const fEdad = document.getElementById('foot-edad-promedio');
  if (fEst) fEst.innerText = totalEstudiantes;
  if (fEdad) fEdad.innerText = `${edadPromedioGlobal} años`;

  const tbody = document.getElementById('tabla-reporte-body');
  if (!tbody) return;

  tbody.innerHTML = estadoCursos.map(c => {
    const estudiantesDelCurso = estadoEstudiantes.filter(e => String(e.idCurso) === String(c.id));
    const cantidad = estudiantesDelCurso.length;
    const pct = totalEstudiantes > 0 ? ((cantidad / totalEstudiantes) * 100).toFixed(0) : 0;

    const sumaEdadesCurso = estudiantesDelCurso.reduce((acc, curr) => acc + (Number(curr.edad) || 0), 0);
    const edadPromCurso = cantidad > 0 ? (sumaEdadesCurso / cantidad).toFixed(1) : '0.0';

    return `
      <tr>
        <td><strong>${c.cnombre}</strong></td>
        <td>${c.codigo || ''}</td>
        <td>${c.docente || ''}</td>
        <td>${c.creditos || ''}</td>
        <td>${cantidad}</td>
        <td>
          <div class="progress" style="height: 12px;">
            <div class="progress-bar bg-primary" role="progressbar" style="width: ${pct}%;"></div>
          </div>
        </td>
        <td>${edadPromCurso} años</td>
      </tr>
    `;
  }).join('');
}