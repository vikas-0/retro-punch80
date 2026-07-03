const RUNTIME_PATH = "/lfortran/";
const RUNTIME_VERSION = "LFortran 0.52.0 · WASM";

function stripAnsi(value) {
  return value.replace(/[\u001b\u009b][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g, "");
}

function exportedCompilerFunctions(module) {
  return {
    emitWasm: module.cwrap("emit_wasm_from_source", "string", ["string"]),
    emitWat: module.cwrap("emit_wat_from_source", "string", ["string"]),
  };
}

export function loadLFortran(onStatus = () => {}) {
  if (window.__punch80LFortranRuntime) {
    onStatus("LFORTRAN READY");
    return Promise.resolve(window.__punch80LFortranRuntime);
  }

  if (window.__punch80LFortranPromise) return window.__punch80LFortranPromise;

  window.__punch80LFortranPromise = new Promise((resolve, reject) => {
    onStatus("LOADING LFORTRAN CORE");

    window.Module = {
      locateFile: (filename) => `${RUNTIME_PATH}${filename}`,
      setStatus: (message) => {
        if (message) onStatus(message.toUpperCase());
      },
      onAbort: (reason) => reject(new Error(`LFortran initialization failed: ${reason}`)),
      onRuntimeInitialized() {
        try {
          const runtime = {
            ...exportedCompilerFunctions(window.Module),
            version: RUNTIME_VERSION,
          };
          window.__punch80LFortranRuntime = runtime;
          onStatus("LFORTRAN READY");
          resolve(runtime);
        } catch (error) {
          reject(error);
        }
      },
    };

    const existingScript = document.querySelector('script[data-punch80-lfortran="true"]');
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = `${RUNTIME_PATH}lfortran.js`;
    script.async = true;
    script.dataset.punch80Lfortran = "true";
    script.onerror = () => reject(new Error("Could not load the local LFortran WebAssembly runtime."));
    document.head.appendChild(script);
  });

  return window.__punch80LFortranPromise;
}

function createWasiImports(writeOutput) {
  let memory;
  const exitCode = { value: 0 };

  const fdWrite = (_fileDescriptor, iovAddress, iovCount, bytesWrittenAddress) => {
    let bytesWritten = 0;
    let text = "";
    const view = new DataView(memory.buffer);
    const decoder = new TextDecoder("utf-8");

    for (let index = 0; index < iovCount; index += 1) {
      const entryAddress = iovAddress + index * 8;
      const stringAddress = view.getUint32(entryAddress, true);
      const stringLength = view.getUint32(entryAddress + 4, true);
      text += decoder.decode(new Uint8Array(memory.buffer, stringAddress, stringLength));
      bytesWritten += stringLength;
    }

    if (bytesWrittenAddress) view.setUint32(bytesWrittenAddress, bytesWritten, true);
    if (text) writeOutput(text);
    return 0;
  };

  const imports = {
    wasi_snapshot_preview1: {
      fd_write: fdWrite,
      proc_exit: (value) => {
        exitCode.value = value;
      },
    },
    js: {
      cpu_time: () => Date.now() / 1000,
      show_img: () => 0,
      show_img_color: () => 0,
    },
  };

  return {
    imports,
    exitCode,
    setMemory(nextMemory) {
      memory = nextMemory;
    },
  };
}

export async function compileAndRunFortran(source, onStatus = () => {}) {
  const runtime = await loadLFortran(onStatus);
  onStatus("COMPILING FORTRAN TO WASM");

  const compileStarted = performance.now();
  const response = runtime.emitWasm(source);
  const compileMs = performance.now() - compileStarted;

  if (!response) throw new Error("LFortran returned no compiler output.");

  const [exitCode, ...result] = response.split(",");
  if (exitCode !== "0") {
    throw new Error(stripAnsi(result.join(",")).trim() || "Fortran compilation failed.");
  }

  onStatus("EXECUTING WASM PROGRAM");
  const wasmBytes = Uint8Array.from(result, (value) => Number(value));
  const chunks = [];
  const wasi = createWasiImports((text) => chunks.push(text));
  const instance = await WebAssembly.instantiate(wasmBytes, wasi.imports);
  wasi.setMemory(instance.instance.exports.memory);

  const executionStarted = performance.now();
  try {
    instance.instance.exports._start();
  } catch (error) {
    if (wasi.exitCode.value !== 0) throw error;
  }
  const executionMs = performance.now() - executionStarted;

  if (wasi.exitCode.value !== 0) {
    throw new Error(`Fortran program exited with status ${wasi.exitCode.value}.`);
  }

  onStatus("EXECUTION COMPLETE");
  return {
    output: chunks.join("") || "Program completed without printing output.",
    compileMs,
    executionMs,
    wasmBytes: wasmBytes.byteLength,
    version: runtime.version,
  };
}
