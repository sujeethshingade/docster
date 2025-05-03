import os
import markdown
from fpdf import FPDF
from docx import Document
from docx.shared import Inches


class ExportService:
    def __init__(self):
        pass

    def markdown_to_pdf(self, markdown_content, output_file):
        """Convert markdown content to PDF"""
        html_content = markdown.markdown(markdown_content)

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)

        for line in html_content.split('<p>'):
            if '</p>' in line:
                text = line.split('</p>')[0]
                pdf.multi_cell(0, 10, txt=text)

        pdf.output(output_file)
        return output_file

    def markdown_to_docx(self, markdown_content, output_file):
        """Convert markdown content to Word document"""

        doc = Document()
        doc.add_heading('Documentation', 0)

        paragraphs = markdown_content.split('\n\n')

        for paragraph in paragraphs:
            if paragraph.startswith('# '):
                doc.add_heading(paragraph[2:], level=1)
            elif paragraph.startswith('## '):
                doc.add_heading(paragraph[3:], level=2)
            elif paragraph.startswith('### '):
                doc.add_heading(paragraph[4:], level=3)
            elif paragraph.startswith('```') and paragraph.endswith('```'):
                code = paragraph[3:-3]
                doc.add_paragraph(code, style='Code')
            else:
                doc.add_paragraph(paragraph)

        doc.save(output_file)
        return output_file

    def export_documentation(self, content, format_type, output_path):
        """Export documentation to the specified format"""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        if format_type.lower() == 'pdf':
            return self.markdown_to_pdf(content, output_path)
        elif format_type.lower() == 'docx':
            return self.markdown_to_docx(content, output_path)
        else:
            raise ValueError(
                f"Unsupported format: {format_type}. Supported formats: pdf, docx")
