import json
from channels.generic.websocket import AsyncWebsocketConsumer

class TicketConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send(text_data=json.dumps({
            'message': 'Connexion WebSocket établie.'
        }))

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        await self.send(text_data=json.dumps({
            'message': f"Message reçu : {text_data}"
        }))
