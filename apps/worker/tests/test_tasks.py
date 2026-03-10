from app.tasks import typed_task


def test_typed_task_decorator():
    @typed_task(name="tests.dummy_task")
    def dummy_task(x: int) -> int:
        return x + 1

    assert dummy_task(5) == 6
