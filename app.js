// app.js: lógica del formulario (separada)

// Render radio de productos
const productosContainer = document.getElementById("productosContainer");

function renderProductos() {
  productosContainer.innerHTML = "";
  PRODUCTOS.forEach((group) => {
    const wrap = document.createElement("div");
    wrap.className = "border rounded-lg p-4";

    const title = document.createElement("h3");
    title.className = "font-semibold text-sky-700 mb-2";
    title.textContent = group.base;
    wrap.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 md:grid-cols-2 gap-2";

    group.items.forEach(([code, label]) => {
      const l = document.createElement("label");
      l.className = "flex items-start gap-2 p-2 rounded hover:bg-sky-50 cursor-pointer border";
      l.innerHTML = `
        <input type="radio" name="producto_principal" value="${code}" required class="mt-1">
        <span><b>${code}</b> — ${label}</span>
      `;
      grid.appendChild(l);
    });

    wrap.appendChild(grid);
    productosContainer.appendChild(wrap);
  });
}
renderProductos();

// Personal condicional
const bloquePersonal = document.getElementById("bloquePersonal");
const personalTbody = document.getElementById("personalTbody");
const btnAddFila = document.getElementById("btnAddFila");

function addFilaPersonal(prefill = { nombre: "", dni: "", carnet: "" }) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="p-2 border">
      <input class="w-full p-2 border rounded" placeholder="Apellido y Nombre" value="${prefill.nombre}">
    </td>
    <td class="p-2 border">
      <input class="w-full p-2 border rounded" placeholder="DNI" inputmode="numeric" value="${prefill.dni}">
    </td>
    <td class="p-2 border">
      <input class="w-full p-2 border rounded" placeholder="N° carnet / Sí-No" value="${prefill.carnet}">
    </td>
    <td class="p-2 border text-center">
      <button type="button" class="text-red-600 font-semibold">X</button>
    </td>
  `;
  tr.querySelector("button").addEventListener("click", () => tr.remove());
  personalTbody.appendChild(tr);
}

document.querySelectorAll('input[name="tiene_personal"]').forEach((r) => {
  r.addEventListener("change", () => {
    const tiene = document.querySelector('input[name="tiene_personal"]:checked')?.value;
    if (tiene === "si") {
      bloquePersonal.classList.remove("hidden");
      if (personalTbody.children.length === 0) addFilaPersonal();
    } else {
      bloquePersonal.classList.add("hidden");
      personalTbody.innerHTML = "";
    }
  });
});

btnAddFila.addEventListener("click", () => addFilaPersonal());

// Helpers submit
const ok = document.getElementById("ok");
const err = document.getElementById("err");
const debug = document.getElementById("debug");

function getPersonalFromTable() {
  const rows = Array.from(personalTbody.querySelectorAll("tr"));
  return rows
    .map((tr) => {
      const inputs = tr.querySelectorAll("input");
      return {
        nombre: inputs[0].value.trim(),
        dni: inputs[1].value.trim(),
        carnet: inputs[2].value.trim(),
      };
    })
    .filter((x) => x.nombre || x.dni || x.carnet);
}

function setLoading(isLoading) {
  const btn = document.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Enviando..." : "Enviar solicitud";
  btn.classList.toggle("opacity-60", isLoading);
}

document.getElementById("formulario").addEventListener("submit", async (e) => {
  e.preventDefault();
  ok.classList.add("hidden");
  err.classList.add("hidden");
  debug.classList.add("hidden");

  const form = new FormData(e.target);

  const payload = {
    dueno: {
      nombre: form.get("dueno_nombre"),
      dni: form.get("dueno_dni"),
      telefono: form.get("dueno_telefono"),
      domicilio: form.get("dueno_domicilio"),
    },
    emprendimiento: {
      rubro: form.get("empr_rubro"),
      producto_texto: form.get("empr_producto_texto"),
      materias_primas: form.get("empr_materias_primas"),
      inicio_actividad: form.get("empr_inicio_actividad"),
      elaboracion_semanal: form.get("empr_elaboracion_semanal"),
    },
    producto_principal: form.get("producto_principal"),
    producto_otro: form.get("producto_otro") || "",
    personal: form.get("tiene_personal") === "si" ? getPersonalFromTable() : [],
    turno: { fecha: form.get("turno_fecha"), hora: form.get("turno_hora") },
    observaciones: form.get("observaciones") || "",
    created_at: new Date().toISOString(),
  };

  if (form.get("tiene_personal") === "si" && payload.personal.length === 0) {
    alert("Marcaste que tenés personal, pero no cargaste ningún manipulador.");
    return;
  }

  setLoading(true);
  try {
    // Se envía a /turno (server.js lo reenvía al Apps Script)
    const resp = await fetch("/turno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (!resp.ok || data.ok === false) {
      throw new Error(data?.error || data?.mensaje || "No se pudo enviar el formulario.");
    }

    ok.classList.remove("hidden");
    debug.classList.remove("hidden");
    debug.textContent = JSON.stringify({ payload, backend: data }, null, 2);

    window.scrollTo(0, document.body.scrollHeight);
    e.target.reset();

    // reset tabla personal si estaba
    bloquePersonal.classList.add("hidden");
    personalTbody.innerHTML = "";
  } catch (error) {
    err.classList.remove("hidden");
    err.textContent = "❌ Error: " + (error?.message || String(error));
    debug.classList.remove("hidden");
    debug.textContent = String(error?.stack || error);
  } finally {
    setLoading(false);
  }
});
