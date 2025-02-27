package grok_connect.log;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.StackTraceElementProxy;
import ch.qos.logback.core.AppenderBase;
import com.google.gson.Gson;
import grok_connect.handlers.QueryHandler;
import grok_connect.handlers.SessionHandler;
import org.slf4j.MDC;
import org.slf4j.Marker;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

public class QueryStreamAppender extends AppenderBase<ILoggingEvent> {
    private static final String COMPONENT = "source";
    private static final String COMPONENT_NAME = "GrokConnect";
    private static final String DESTINATION_KEY = "DESTINATION";
    private static final String EVENT_STAGE_KEY = "EVENT_STAGE_KEY";
    private static final String EVENT_DF_NUMBER_KEY = "EVENT_DF_NUMBER_KEY";
    private static final String EVENT_DEST_GC_SERVER = "GrokConnect -> Server";
    private static final Gson GSON = new Gson();

    @Override
    protected void append(ILoggingEvent iLoggingEvent) {
        String id = MDC.get(QueryHandler.CALL_ID_HEADER);
        SessionHandler handler = QueryHandler.getSessionHandler(id);
        if (handler == null || handler.skipLog(iLoggingEvent.getLevel().levelStr.toLowerCase()))
            return;
        Marker marker = iLoggingEvent.getMarker() == null ? EventType.MISC.getMarker()
                : iLoggingEvent.getMarker();
        String[] split = marker.getName().split("\\|");
        String flag = split[0];
        String dfNumber = split[1];
        String stage = split[2];
        Map<String, Object> params = new HashMap<>();
        params.put(COMPONENT, COMPONENT_NAME);
        if (!dfNumber.equals(" "))
            params.put(EVENT_DF_NUMBER_KEY, Integer.parseInt(dfNumber));
        if (!stage.equals(" "))
            params.put(EVENT_STAGE_KEY, stage);
        if (flag.equals(EventType.CHECKSUM_SEND.toString())
                || flag.equals(EventType.SOCKET_BINARY_DATA_EXCHANGE.toString()))
            params.put(DESTINATION_KEY, EVENT_DEST_GC_SERVER);
        String stackTrace = iLoggingEvent.getLevel().equals(Level.ERROR) ?
                Arrays.stream(iLoggingEvent.getThrowableProxy().getStackTraceElementProxyArray())
                        .map(StackTraceElementProxy::getSTEAsString)
                        .collect(Collectors.joining(System.lineSeparator()))
                : null;
        LogMessage message = new LogMessage(
                iLoggingEvent.getLevel().levelStr.toLowerCase(),
                iLoggingEvent.getTimeStamp(),
                iLoggingEvent.getFormattedMessage(),
                flag, params, stackTrace);
        handler.getSession().getRemote().sendStringByFuture(String.format("LOG %s", GSON.toJson(message)));
    }
}
