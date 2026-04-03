import os
import importlib


def main():
    dotenv = importlib.import_module("dotenv")
    pymysql = importlib.import_module("pymysql")

    load_dotenv = dotenv.load_dotenv
    load_dotenv("backend/.env")

    connection = pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        port=int(os.getenv("DB_PORT", "3306")),
        database=os.getenv("DB_NAME", "meal_planner"),
    )

    try:
        with connection.cursor() as cursor:
            cursor.execute("SHOW TABLES;")
            tables = cursor.fetchall()

            print("Tables in the database:")
            for row in tables:
                print(f"- {row[0]}")

            if tables:
                first_table = tables[0][0]
                cursor.execute(f"DESCRIBE {first_table};")
                columns = cursor.fetchall()

                print(f"\nColumns in {first_table}:")
                for column in columns:
                    print(f"- {column[0]} ({column[1]})")
    finally:
        connection.close()


if __name__ == "__main__":
    main()