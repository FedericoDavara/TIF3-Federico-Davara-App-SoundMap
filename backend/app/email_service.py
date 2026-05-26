import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")
SENDER_NAME = os.getenv("SENDER_NAME", "SoundMap+")


def send_welcome_email(recipient_email: str, username: str) -> bool:
    """
    Envía un email de bienvenida al nuevo usuario registrado
    
    Args:
        recipient_email: Email del usuario
        username: Nombre de usuario
    
    Returns:
        bool: True si se envió correctamente, False si hubo error
    """
    try:
        # Crear mensaje
        message = MIMEMultipart("alternative")
        message["Subject"] = "¡Bienvenido a SoundMap+!"
        message["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        message["To"] = recipient_email

        # Cuerpo del email en HTML
        html = f"""\
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #4CAF50;">¡Bienvenido a SoundMap+, {username}!</h1>
                    
                    <p>Nos complace que te hayas registrado en nuestra plataforma.</p>
                    
                    <p>Con SoundMap+ podrás:</p>
                    <ul>
                        <li>🎙️ Compartir y descubrir sonidos</li>
                        <li>🗺️ Explorar sonidos en un mapa interactivo</li>
                        <li>👥 Conectar con otros usuarios</li>
                    </ul>
                    
                    <p>Tu cuenta está lista. Inicia sesión cuando quieras para comenzar.</p>
                    
                    <p style="margin-top: 30px; font-size: 12px; color: #999;">
                        Este es un email automático. Por favor no respondas directamente.
                    </p>
                </div>
            </body>
        </html>
        """

        # Adjuntar el contenido HTML
        part = MIMEText(html, "html")
        message.attach(part)

        # Enviar email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, recipient_email, message.as_string())

        print(f"✓ Email de bienvenida enviado a {recipient_email}")
        return True

    except Exception as e:
        print(f"✗ Error al enviar email: {str(e)}")
        return False
