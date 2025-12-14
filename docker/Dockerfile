FROM node:22-alpine
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY /app/ ./

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Switch to non-root user
USER nextjs

# Expose the port
EXPOSE 3009

# Set the port environment variable
ENV PORT=3009
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
