import requests

def main():
  r = requests.post('http://127.0.0.1:28101/item?_method=PUT', json={
    'aaa': 'bbb',
  })
  sc = r.status_code
  print('x')
  print(sc)
  # if sc == 200:
    # print(r.json())
    
  
  return
  r = requests.get('http://127.0.0.1:28101/item?htotal=boo')
  sc = r.status_code
  print(sc)
  if sc == 200:
    print(r.json())
  
if __name__ == '__main__':
  main()
