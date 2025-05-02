export const getOrigins = () => {
    if (process.env.IS_DEV === "true") {
        return "*";
    } else {
        return process.env.ORIGINS;
    }
}