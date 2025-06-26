import { Connection, Request } from 'tedious';

export function createDbConnection(connectionString: string): Promise<Connection> {
  return new Promise((resolve, reject) => {
    const connection = new Connection(JSON.parse(connectionString));

    connection.on('connect', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });

    connection.connect();
  });
}
