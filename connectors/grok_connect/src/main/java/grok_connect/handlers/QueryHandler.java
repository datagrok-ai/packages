package grok_connect.handlers;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import grok_connect.GrokConnect;
import grok_connect.connectors_info.DataQueryRunResult;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketClose;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketConnect;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketError;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketMessage;
import org.eclipse.jetty.websocket.api.annotations.WebSocket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

@WebSocket(maxTextMessageSize = 1024 * 1024) // set textMessageSize to 1MB
public class QueryHandler {
    public static final Logger LOGGER = LoggerFactory.getLogger(QueryHandler.class);
    public static final String CALL_ID_HEADER = "callId";
    private static final String WRITE_LOG_HEADER = "writeLog";
    private static final Map<String, SessionHandler> sessions = new ConcurrentHashMap<>();

    @OnWebSocketConnect
    public void onConnect(Session session) throws IOException {
        session.setIdleTimeout(0);
        String id = setMDC(session);
        if (id == null) {
            DataQueryRunResult result = new DataQueryRunResult();
            result.errorMessage = "Call id should be provided as header value [callId] of upgrade request";
            session.getRemote().sendString(String.format("ERROR: %s", GrokConnect.gson.toJson(result)));
            session.close();
            return;
        }
        String writeLog = session.getUpgradeRequest().getHeader(WRITE_LOG_HEADER);
        SessionHandler handler = new SessionHandler(session, writeLog == null || writeLog.equals("false"));
        sessions.put(id, handler);
        LOGGER.info("GrokConnect version: {}", GrokConnect.properties.getProperty("version"));
        LOGGER.debug("Sending CONNECTED message to the server...");
        session.getRemote().sendString("CONNECTED");
        MDC.clear();
    }

    @OnWebSocketClose
    public void onClose(Session session, int statusCode, String reason) {
        try {
            String id = setMDC(session);
            if (sessions.containsKey(id))
                sessions.remove(id).onClose();
        } catch (Throwable e) {
            LOGGER.error("Error happened in onClose", e);
        } finally {
            MDC.clear();
        }
    }

    @OnWebSocketMessage
    public void onMessage(Session session, String message) {
        try {
            String id = setMDC(session);
            if (sessions.containsKey(id))
                sessions.get(id).onMessage(message);
        } catch (Throwable e) {
            onError(session, e);
        } finally {
            MDC.clear();
        }
    }

    @OnWebSocketError
    public void onError(Session session, Throwable error) {
        try {
            String id = setMDC(session);
            if (sessions.containsKey(id))
                sessions.get(id).onError(error);
        } catch (Throwable e) {
            LOGGER.error("Error happened in onError", e);
        } finally {
            MDC.clear();
        }
    }

    public static SessionHandler getSessionHandler(String id) {
        return sessions.get(id);
    }

    private String setMDC(Session session) {
        String id = session.getUpgradeRequest().getHeader(CALL_ID_HEADER);
        if (id != null)
            MDC.put(CALL_ID_HEADER, id);
        return id;
    }
}
