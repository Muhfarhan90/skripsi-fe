const CERTIFICATE_PRINT_FINISHED = "student-certificate-print-finished";

export function printCertificatePreview(previewUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("Print preview hanya tersedia di browser."));
      return;
    }

    const iframe = document.createElement("iframe");
    let settled = false;

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(fallbackTimer);
      iframe.remove();
    };

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };

    const fail = (message: string) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== CERTIFICATE_PRINT_FINISHED) {
        return;
      }

      finish();
    };

    const fallbackTimer = window.setTimeout(() => {
      finish();
    }, 30_000);

    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.src = previewUrl;
    iframe.onload = () => undefined;
    iframe.onerror = () => {
      fail("Halaman sertifikat tidak bisa dimuat.");
    };

    window.addEventListener("message", handleMessage);
    document.body.appendChild(iframe);
  });
}
