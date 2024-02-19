package grok_connect.managers.float_column.converters;

import grok_connect.managers.Converter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;

public class BigDecimalTypeConverter implements Converter<Float> {
    private static final Logger LOGGER = LoggerFactory.getLogger(BigDecimalTypeConverter.class);

    @Override
    public Float convert(Object value) {
        LOGGER.trace(DEFAULT_LOG_MESSAGE, value.getClass());
        return ((BigDecimal)value).floatValue();
    }
}
