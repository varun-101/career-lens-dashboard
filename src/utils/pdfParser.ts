import * as pdfjsLib from 'pdfjs-dist';

// Configure the pdfjs worker to use the CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const extractTextFromPdf = async (fileOrBlob: File | Blob): Promise<string> => {
  try {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => 'str' in item ? item.str : '')
        .join(' ');
      fullText += pageText + '\n\n';
    }

    console.log("Full text extracted from PDF:", fullText);
    return fullText.trim();
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
};
